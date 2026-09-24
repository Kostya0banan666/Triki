import type { TrikiFrame, Vec3 } from '../types/triki';
import {
  DEFAULT_THRESHOLDS,
  type AxisMap,
  type GestureEvent,
  type GestureThresholds,
  type GestureType,
} from './types';

type Listener = (e: GestureEvent) => void;

const mag = (v: Vec3) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const signed = (v: Vec3, m: AxisMap) => (m.invert ? -v[m.axis] : v[m.axis]);

interface Motion {
  start: number;
  peakUD: number;
  peakLR: number;
  peakTW: number;
  peakAccel: number;
}

/**
 * Pure, platform-independent gesture recognizer. Feed it frames with a
 * timestamp (ms); it emits GestureEvents. Call `tick(now)` periodically (or
 * simply keep feeding frames) so timed gestures such as HOLD and SINGLE_CLICK
 * resolve.
 */
export class GestureEngine {
  private listeners = new Set<Listener>();
  private cfg: GestureThresholds;

  private lastButton = false;
  private pressAt = 0;
  private holdFired = false;
  private pendingClickAt: number | null = null;

  private gravity: Vec3 | null = null;
  private rest: Vec3 | null = null;
  private tilted = false;
  private motion: Motion | null = null;
  private cooldownUntil = 0;

  constructor(cfg: Partial<GestureThresholds> = {}) {
    this.cfg = { ...DEFAULT_THRESHOLDS, ...cfg };
  }

  setThresholds(cfg: Partial<GestureThresholds>): void {
    this.cfg = { ...this.cfg, ...cfg };
  }

  get thresholds(): GestureThresholds {
    return this.cfg;
  }

  on(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  /** Use the current orientation as the neutral pose for tilt. */
  calibrateRest(): void {
    this.rest = this.gravity ? { ...this.gravity } : null;
    this.tilted = false;
  }

  reset(): void {
    this.lastButton = false;
    this.pendingClickAt = null;
    this.holdFired = false;
    this.gravity = null;
    this.rest = null;
    this.motion = null;
    this.tilted = false;
  }

  private emit(type: GestureType, confidence: number, peakAccel: number, peakGyro: number, t: number, detail?: string) {
    const e: GestureEvent = { type, confidence: clamp01(confidence), peakAccel, peakGyro, t, detail };
    this.listeners.forEach((l) => l(e));
  }

  tick(now: number): void {
    const c = this.cfg;
    if (this.lastButton && !this.holdFired && now - this.pressAt >= c.holdMs) {
      this.holdFired = true;
      this.pendingClickAt = null;
      this.emit('HOLD', 1, 0, 0, now);
    }
    if (this.pendingClickAt !== null && !this.lastButton && now - this.pendingClickAt > c.doubleClickGapMs) {
      this.pendingClickAt = null;
      this.emit('SINGLE_CLICK', 1, 0, 0, now);
    }
  }

  process(f: TrikiFrame, now: number): void {
    this.handleButton(f.button, now);
    this.tick(now);
    this.handleMotion(f, now);
  }

  private handleButton(pressed: boolean, now: number): void {
    const c = this.cfg;
    if (pressed === this.lastButton) return;
    this.lastButton = pressed;
    if (pressed) {
      this.pressAt = now;
      this.holdFired = false;
      this.emit('BUTTON_PRESS', 1, 0, 0, now);
      return;
    }
    this.emit('BUTTON_RELEASE', 1, 0, 0, now);
    if (this.holdFired) return;
    if (now - this.pressAt > c.clickMaxMs) return;
    if (this.pendingClickAt !== null && now - this.pendingClickAt <= c.doubleClickGapMs + c.clickMaxMs) {
      this.pendingClickAt = null;
      this.emit('DOUBLE_CLICK', 1, 0, 0, now);
    } else {
      this.pendingClickAt = now;
    }
  }

  private handleMotion(f: TrikiFrame, now: number): void {
    const c = this.cfg;
    // low-pass gravity estimate
    const a = f.accel;
    if (!this.gravity) this.gravity = { ...a };
    const k = 0.08;
    const g = this.gravity;
    g.x += (a.x - g.x) * k;
    g.y += (a.y - g.y) * k;
    g.z += (a.z - g.z) * k;
    if (!this.rest) this.rest = { ...g };

    const accelMag = mag(a);
    const linear = mag({ x: a.x - g.x, y: a.y - g.y, z: a.z - g.z });
    const gyroMag = mag(f.gyro);

    // Knock: sharp accel spike while the wrist is not rotating much.
    if (linear >= c.knockG && gyroMag < c.flickRate * 0.8 && now >= this.cooldownUntil) {
      this.cooldownUntil = now + c.cooldownMs;
      this.motion = null;
      this.emit('KNOCK', linear / (c.knockG * 1.5), accelMag, gyroMag, now);
      return;
    }

    // Flick / twist: a burst of angular velocity, classified by dominant axis.
    const ud = signed(f.gyro, c.upDown);
    const lr = signed(f.gyro, c.leftRight);
    const tw = signed(f.gyro, c.twist);
    const active = Math.abs(ud) >= c.flickRate || Math.abs(lr) >= c.flickRate || Math.abs(tw) >= c.twistRate;

    if (active && now >= this.cooldownUntil) {
      if (!this.motion) this.motion = { start: now, peakUD: 0, peakLR: 0, peakTW: 0, peakAccel: 0 };
      const m = this.motion;
      if (Math.abs(ud) > Math.abs(m.peakUD)) m.peakUD = ud;
      if (Math.abs(lr) > Math.abs(m.peakLR)) m.peakLR = lr;
      if (Math.abs(tw) > Math.abs(m.peakTW)) m.peakTW = tw;
      m.peakAccel = Math.max(m.peakAccel, accelMag);
    } else if (this.motion && gyroMag < c.flickRate * 0.5) {
      this.finishMotion(now);
    }
    if (this.motion && now - this.motion.start > c.motionMaxMs * 2) this.motion = null; // too slow: not a gesture

    // Tilt: sustained orientation change relative to rest.
    if (this.rest && !this.motion) {
      const r = this.rest;
      const cos = (g.x * r.x + g.y * r.y + g.z * r.z) / ((mag(g) || 1) * (mag(r) || 1));
      const deg = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
      if (!this.tilted && deg >= c.tiltDeg && gyroMag < 60) {
        this.tilted = true;
        this.emit('TILT', deg / (c.tiltDeg * 1.5), accelMag, gyroMag, now, `${deg.toFixed(0)}°`);
      } else if (this.tilted && deg < c.tiltDeg * 0.6) {
        this.tilted = false;
      }
    }
  }

  private finishMotion(now: number): void {
    const c = this.cfg;
    const m = this.motion!;
    this.motion = null;
    if (now - m.start > c.motionMaxMs) return;
    const aUD = Math.abs(m.peakUD) / c.flickRate;
    const aLR = Math.abs(m.peakLR) / c.flickRate;
    const aTW = Math.abs(m.peakTW) / c.twistRate;
    const best = Math.max(aUD, aLR, aTW);
    const second = [aUD, aLR, aTW].sort((p, q) => q - p)[1];
    // confidence: how far above threshold and how dominant the axis is
    const confidence = clamp01((best - 1) / 1.5 + 0.5) * clamp01(1 - second / best + 0.35);
    let type: GestureType;
    let peak: number;
    if (best === aTW) {
      type = m.peakTW > 0 ? 'TWIST_CW' : 'TWIST_CCW';
      peak = Math.abs(m.peakTW);
    } else if (best === aUD) {
      type = m.peakUD > 0 ? 'FLICK_UP' : 'FLICK_DOWN';
      peak = Math.abs(m.peakUD);
    } else {
      type = m.peakLR > 0 ? 'FLICK_RIGHT' : 'FLICK_LEFT';
      peak = Math.abs(m.peakLR);
    }
    this.cooldownUntil = now + c.cooldownMs;
    this.emit(type, confidence, m.peakAccel, peak, now);
  }
}
