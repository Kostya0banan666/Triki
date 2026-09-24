/*
 * Motion recognition for the Triki cap.
 *
 * The body-frame motion logic (gravity/bias learning, twist = gyro projected on
 * gravity, stamp, flip, slide, one-motion-one-action locking) is adapted from
 * TRIKI Control's TrikiMotionEngine by Wojciech "Koksny" Górny, MIT License,
 * https://github.com/koksny/TRIKI-Control. Its thresholds are in raw sensor
 * units and were tuned on real hardware at the ~53 Hz stream rate.
 */
import type { TrikiFrame } from '../types/triki';
import { ACCEL_SCALE, GYRO_SCALE } from '../bluetooth/TrikiFrameParser';
import {
  DEFAULT_THRESHOLDS,
  type GestureEvent,
  type GestureThresholds,
  type GestureType,
  type MotionAction,
  type MotionState,
} from './types';

type Listener = (e: GestureEvent) => void;
type V3 = [number, number, number];

const GRAVITY = 2050;
const SETTLE_S = 1.2;

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3) => Math.sqrt(dot(a, a));
const unit = (a: V3): V3 => {
  const n = norm(a);
  return n <= 1e-9 ? [0, 0, 0] : [a[0] / n, a[1] / n, a[2] / n];
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const median = (xs: number[]) => {
  const s = [...xs].sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m]);
};

type Held = 'IDLE' | 'TWIST_RIGHT' | 'TWIST_LEFT' | 'TILT' | 'SLIDE';

export class GestureEngine {
  private listeners = new Set<Listener>();
  private cfg: GestureThresholds;
  /** When false, a tap fires immediately instead of waiting for a possible double tap. */
  deferTap = true;

  // ---- motion engine state ----
  private gravity: V3 | null = null;
  private gravityRef: V3 = [0, 0, -GRAVITY];
  private gyroBias: V3 = [0, 0, 0];
  private firstT = 0;
  private booted = false;
  private bootGyro: V3[] = [];
  private bootAccel: V3[] = [];
  private stillSince: number | null = null;
  private flipSince: number | null = null;
  private flipped = false;
  private lastStamp: number | null = null;
  private stampArmed = true;
  private goTiltSamples = 0;
  private turning = 0;
  private horizontalActive = false;
  private gesture: Held = 'IDLE';
  private candidate: Held = 'IDLE';
  private candidateSamples = 0;
  private idleSamples = 0;
  private heldStrength = 0;

  // ---- event layer ----
  private heldSince: number | null = null;
  private lastRepeat = 0;
  private peakGyro = 0;
  private peakAccel = 0;
  private pendingTapAt: number | null = null;
  private wasFlipped = false;
  private lastButton = false;
  private pressAt = 0;
  private holdFired = false;
  private pendingClickAt: number | null = null;

  state: MotionState = { action: 'SETTLING', strength: 0, twist: 0, spin: 0, tilt: 0 };

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

  /** Forget calibration (call on (re)connect). */
  reset(): void {
    this.gravity = null;
    this.booted = false;
    this.bootGyro = [];
    this.bootAccel = [];
    this.stillSince = null;
    this.flipSince = null;
    this.flipped = false;
    this.wasFlipped = false;
    this.lastStamp = null;
    this.stampArmed = true;
    this.goTiltSamples = 0;
    this.pendingTapAt = null;
    this.lastButton = false;
    this.pendingClickAt = null;
    this.holdFired = false;
    this.heldSince = null;
    this.lastHeld = 'IDLE';
    this.clearGesture();
    this.state = { action: 'SETTLING', strength: 0, twist: 0, spin: 0, tilt: 0 };
  }

  private emit(type: GestureType, confidence: number, t: number, repeat = false, peakAccel = this.peakAccel) {
    const e: GestureEvent = {
      type,
      confidence: clamp(confidence, 0, 1),
      peakAccel: peakAccel / ACCEL_SCALE,
      peakGyro: this.peakGyro / GYRO_SCALE,
      t,
      repeat,
    };
    this.listeners.forEach((l) => l(e));
  }

  /** Resolves timed events (single tap/click, hold). Called on every frame and by a timer. */
  tick(nowMs: number): void {
    const c = this.cfg;
    if (this.pendingTapAt !== null && nowMs - this.pendingTapAt > c.doubleTapMs) {
      this.pendingTapAt = null;
      this.emit('TAP', 1, nowMs, false, this.tapPeak);
    }
    if (this.lastButton && !this.holdFired && nowMs - this.pressAt >= c.holdMs) {
      this.holdFired = true;
      this.pendingClickAt = null;
      this.emit('HOLD', 1, nowMs);
    }
    if (this.pendingClickAt !== null && !this.lastButton && nowMs - this.pendingClickAt > c.doubleClickGapMs) {
      this.pendingClickAt = null;
      this.emit('CLICK', 1, nowMs);
    }
  }

  process(f: TrikiFrame, nowMs: number): MotionState {
    this.handleButton(f.button, nowMs);
    this.tick(nowMs);
    const s = this.addSample(nowMs / 1000, f);
    this.state = s;
    this.handleMotionEvents(s, nowMs);
    return s;
  }

  // ------------------------------------------------------------------ button
  private handleButton(pressed: boolean, now: number): void {
    const c = this.cfg;
    if (pressed === this.lastButton) return;
    this.lastButton = pressed;
    if (pressed) {
      this.pressAt = now;
      this.holdFired = false;
      this.emit('BUTTON_PRESS', 1, now);
      return;
    }
    this.emit('BUTTON_RELEASE', 1, now);
    if (this.holdFired || now - this.pressAt > c.clickMaxMs) return;
    if (this.pendingClickAt !== null && now - this.pendingClickAt <= c.doubleClickGapMs + c.clickMaxMs) {
      this.pendingClickAt = null;
      this.emit('DOUBLE_CLICK', 1, now);
    } else {
      this.pendingClickAt = now;
    }
  }

  // ------------------------------------------------------------------ events
  private handleMotionEvents(s: MotionState, now: number): void {
    const c = this.cfg;
    if (s.action === 'SETTLING') return;
    this.peakGyro = Math.max(this.peakGyro, s.spin);

    // flip: edge-triggered
    if (s.action === 'FLIP' && !this.wasFlipped) {
      this.wasFlipped = true;
      this.emit('FLIP', 1, now);
    } else if (s.action !== 'FLIP' && this.wasFlipped) {
      this.wasFlipped = false;
    }

    if (s.action === 'TAP') {
      this.tapPeak = this.peakAccel;
      if (this.pendingTapAt !== null) {
        this.pendingTapAt = null;
        this.emit('DOUBLE_TAP', s.strength, now);
      } else if (this.deferTap) {
        this.pendingTapAt = now;
      } else {
        this.emit('TAP', s.strength, now);
      }
      this.peakGyro = 0;
      this.peakAccel = 0;
      return;
    }

    const held: Held =
      s.action === 'TWIST_RIGHT' || s.action === 'TWIST_LEFT' || s.action === 'TILT' || s.action === 'SLIDE' ? s.action : 'IDLE';
    if (held === 'IDLE') {
      this.heldSince = null;
      if (s.action === 'IDLE') {
        this.peakGyro = 0;
        this.peakAccel = 0;
      }
      return;
    }
    if (this.heldSince === null || this.lastHeld !== held) {
      this.heldSince = now;
      this.lastRepeat = now;
      this.lastHeld = held;
      this.emit(held, s.strength, now);
    } else if (held !== 'SLIDE' && now - this.lastRepeat >= c.repeatMs && now - this.heldSince >= c.repeatMs * 1.5) {
      this.lastRepeat = now;
      this.emit(held, s.strength, now, true);
    }
  }
  private lastHeld: Held = 'IDLE';
  private tapPeak = 0;

  // ------------------------------------------------------------------ engine
  private addSample(t: number, f: TrikiFrame): MotionState {
    const c = this.cfg;
    const gyro: V3 = [f.gyro.x * GYRO_SCALE, f.gyro.y * GYRO_SCALE, f.gyro.z * GYRO_SCALE];
    const accel: V3 = [f.accel.x * ACCEL_SCALE, f.accel.y * ACCEL_SCALE, f.accel.z * ACCEL_SCALE];
    const accelMag = norm(accel);
    if (accelMag < 800 || accelMag > 8000) return { ...this.state, action: this.state.action === 'SETTLING' ? 'SETTLING' : 'IDLE' };
    this.peakAccel = Math.max(this.peakAccel, accelMag);

    if (!this.gravity) {
      this.gravity = [...accel];
      this.gravityRef = [...accel];
      this.gyroBias = [...gyro];
      this.firstT = t;
    }
    if (!this.booted) {
      this.bootGyro.push([...gyro]);
      this.bootAccel.push([...accel]);
      if (t - this.firstT >= SETTLE_S && this.bootGyro.length >= 5) {
        for (let a = 0; a < 3; a++) {
          this.gyroBias[a] = median(this.bootGyro.map((v) => v[a]));
          this.gravityRef[a] = median(this.bootAccel.map((v) => v[a]));
          this.gravity[a] = this.gravityRef[a];
        }
        this.bootGyro = [];
        this.bootAccel = [];
        this.booted = true;
      }
    }

    const g = this.gravity;
    const accelDev = Math.abs(accelMag - GRAVITY);
    const alpha = accelDev < 400 ? 0.25 : 0;
    for (let a = 0; a < 3; a++) g[a] = (1 - alpha) * g[a] + alpha * accel[a];
    const gu = unit(g);
    const cg: V3 = [gyro[0] - this.gyroBias[0], gyro[1] - this.gyroBias[1], gyro[2] - this.gyroBias[2]];
    const spin = norm(cg);
    const rawTwist = dot(cg, gu);
    // koksny's default (invertTurn) treats a negative projection as a right twist
    const twist = c.invertTurn ? -rawTwist : rawTwist; // + = right
    const verticalImpact = Math.abs(Math.abs(dot(accel, gu)) - GRAVITY);
    const horizontal = Math.hypot(accel[0] - this.gravityRef[0], accel[1] - this.gravityRef[1]);
    const tilt = Math.sqrt(Math.max(0, GRAVITY * GRAVITY - g[2] * g[2]));
    const out = (action: MotionAction, strength: number): MotionState => ({ action, strength, twist, spin, tilt });

    this.goTiltSamples = tilt >= c.tiltAmount ? Math.min(this.goTiltSamples + 1, 6) : Math.max(this.goTiltSamples - 1, 0);
    const tilted = this.goTiltSamples >= 2;

    const invertedRest = g[2] >= 1200 && accelDev < 90 && spin < 400;
    if (invertedRest) {
      if (this.flipSince === null) this.flipSince = t;
      this.flipped = t - this.flipSince >= 0.3;
    } else {
      this.flipSince = null;
      this.flipped = false;
    }

    const still = spin < 220 && accelDev < 90;
    if (still) {
      if (this.stillSince === null) this.stillSince = t;
      if (t - this.stillSince >= 0.2) {
        if (!this.flipped && tilt < 160) {
          this.gravityRef[0] = 0.88 * this.gravityRef[0] + 0.12 * accel[0];
          this.gravityRef[1] = 0.88 * this.gravityRef[1] + 0.12 * accel[1];
        }
        for (let a = 0; a < 3; a++) this.gyroBias[a] = 0.95 * this.gyroBias[a] + 0.05 * gyro[a];
      }
    } else {
      this.stillSince = null;
    }

    if (!this.booted || t - this.firstT < SETTLE_S) {
      this.clearGesture();
      return out('SETTLING', 0);
    }
    if (this.flipped) {
      this.clearGesture();
      return out('FLIP', 1);
    }

    if (verticalImpact < 190) this.stampArmed = true;
    const stampReady = this.lastStamp === null || t - this.lastStamp >= 0.45;
    if (verticalImpact >= c.tapImpact && spin < 800 && tilt < 550 && this.stampArmed && stampReady) {
      this.lastStamp = t;
      this.stampArmed = false;
      this.goTiltSamples = 0;
      this.clearGesture();
      return out('TAP', clamp(verticalImpact / (c.tapImpact * 2), 0.5, 1));
    }

    const raw = this.rawCandidate(twist, spin, horizontal, tilted, accelDev);
    const strength = this.strength(raw, twist, tilt);
    const active = this.lock(raw, strength);
    return out(active, active === 'IDLE' ? 0 : this.heldStrength);
  }

  private rawCandidate(twist: number, spin: number, horizontal: number, tilted: boolean, accelDev: number): Held {
    const c = this.cfg;
    this.horizontalActive = horizontal >= (this.horizontalActive ? 160 : 270);
    if (tilted && this.horizontalActive) {
      this.turning = 0;
      return 'TILT';
    }
    const spinThreshold = 1300 - c.turnSensitivity * 10;
    const axisFraction = 0.75 - c.turnSensitivity * 0.004;
    const threshold = this.turning === 0 ? c.turnThreshold : c.turnThreshold * 0.69;
    if (spin >= spinThreshold && Math.abs(twist) >= threshold && Math.abs(twist) >= axisFraction * spin) {
      this.turning = twist > 0 ? 1 : -1;
      return twist > 0 ? 'TWIST_RIGHT' : 'TWIST_LEFT';
    }
    this.turning = 0;
    if (!this.horizontalActive) return 'IDLE';
    if (spin < 800 && accelDev < 450) return 'SLIDE';
    return 'IDLE';
  }

  private lock(raw: Held, strength: number): Held {
    const engage = (a: Held) => (a === 'SLIDE' ? 4 : 3);
    if (this.gesture !== 'IDLE') {
      if (raw === this.gesture) {
        this.idleSamples = 0;
        this.candidate = 'IDLE';
        this.candidateSamples = 0;
        this.heldStrength = strength;
        return this.gesture;
      }
      if (raw === 'IDLE') {
        this.candidate = 'IDLE';
        this.candidateSamples = 0;
        if (++this.idleSamples >= 3) {
          this.clearGesture();
          return 'IDLE';
        }
        return this.gesture;
      }
      this.idleSamples = 0;
      if (this.candidate === raw) this.candidateSamples++;
      else {
        this.candidate = raw;
        this.candidateSamples = 1;
      }
      if (this.candidateSamples >= engage(raw)) {
        this.gesture = raw;
        this.candidate = 'IDLE';
        this.candidateSamples = 0;
        this.heldStrength = strength;
      }
      return this.gesture;
    }
    if (raw === 'IDLE') {
      this.candidate = 'IDLE';
      this.candidateSamples = 0;
      return 'IDLE';
    }
    if (this.candidate === raw) this.candidateSamples++;
    else {
      this.candidate = raw;
      this.candidateSamples = 1;
    }
    if (this.candidateSamples >= engage(raw)) {
      this.gesture = raw;
      this.candidate = 'IDLE';
      this.candidateSamples = 0;
      this.idleSamples = 0;
      this.heldStrength = strength;
      return this.gesture;
    }
    return 'IDLE';
  }

  private strength(a: Held, twist: number, tilt: number): number {
    const c = this.cfg;
    if (a === 'TWIST_LEFT' || a === 'TWIST_RIGHT') {
      const release = c.turnThreshold * 0.69;
      const full = c.turnThreshold * 2.6;
      return clamp((Math.abs(twist) - release) / (full - release), 0.18, 1);
    }
    if (a === 'TILT') return clamp((tilt - 200) / 900, 0.35, 1);
    return a === 'IDLE' ? 0 : 1;
  }

  private clearGesture(): void {
    this.gesture = 'IDLE';
    this.candidate = 'IDLE';
    this.candidateSamples = 0;
    this.idleSamples = 0;
    this.heldStrength = 0;
    this.turning = 0;
    this.horizontalActive = false;
  }
}
