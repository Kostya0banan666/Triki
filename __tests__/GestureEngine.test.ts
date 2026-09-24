import { GestureEngine } from '../src/gestures/GestureEngine';
import type { GestureEvent, GestureType } from '../src/gestures/types';
import type { TrikiFrame } from '../src/types/triki';

/** Build a frame from RAW sensor units (what the cap actually sends). */
const raw = (g: [number, number, number], a: [number, number, number], button = false): TrikiFrame => ({
  button,
  gyro: { x: g[0] / 131, y: g[1] / 131, z: g[2] / 131 },
  accel: { x: a[0] / 2048, y: a[1] / 2048, z: a[2] / 2048 },
});

// Values seen on a real cap lying flat: gyro bias and gravity on -Z.
const BIAS: [number, number, number] = [12, -31, -22];
const FLAT: [number, number, number] = [24, 0, -2050];
const DT = 19; // ~53 Hz

const flat = (button = false) => raw(BIAS, FLAT, button);
// A clockwise twist (seen from above) on a real cap lying flat reads as negative gyro Z.
const RIGHT = -2500;
const twist = (rate: number) => raw([BIAS[0], BIAS[1], BIAS[2] + rate], FLAT);

class Rig {
  e = new GestureEngine();
  t = 1000;
  events: GestureEvent[] = [];
  constructor(deferTap = true) {
    this.e.deferTap = deferTap;
    this.e.on((ev) => this.events.push(ev));
    this.feed(flat(), 1600); // settle + calibrate
  }
  feed(f: TrikiFrame, ms: number) {
    const end = this.t + ms;
    for (; this.t < end; this.t += DT) this.e.process(f, this.t);
  }
  types(includeRepeats = false): GestureType[] {
    return this.events
      .filter((e) => includeRepeats || !e.repeat)
      .filter((e) => e.type !== 'BUTTON_PRESS' && e.type !== 'BUTTON_RELEASE')
      .map((e) => e.type);
  }
}

describe('GestureEngine (heading-free moves)', () => {
  it('stays quiet while settling and at rest', () => {
    const r = new Rig();
    r.feed(flat(), 2000);
    expect(r.types()).toEqual([]);
    expect(r.e.state.action).toBe('IDLE');
  });

  it('twist right / left, once per twist', () => {
    const r = new Rig();
    r.feed(twist(RIGHT), 150);
    r.feed(flat(), 300);
    r.feed(twist(-RIGHT), 150);
    r.feed(flat(), 300);
    expect(r.types()).toEqual(['TWIST_RIGHT', 'TWIST_LEFT']);
  });

  it('a held twist auto-repeats (volume knob)', () => {
    const r = new Rig();
    r.feed(twist(RIGHT), 1200);
    const all = r.types(true);
    expect(all[0]).toBe('TWIST_RIGHT');
    expect(all.length).toBeGreaterThanOrEqual(3);
    expect(r.events.filter((e) => e.repeat).length).toBeGreaterThanOrEqual(2);
  });

  it('invertTurn swaps direction', () => {
    const r = new Rig();
    r.e.setThresholds({ invertTurn: true });
    r.feed(twist(RIGHT), 150);
    r.feed(flat(), 300);
    expect(r.types()).toEqual(['TWIST_LEFT']);
  });

  it('ignores slow rotation below the twist threshold', () => {
    const r = new Rig();
    r.feed(twist(500), 500);
    r.feed(flat(), 300);
    expect(r.types()).toEqual([]);
  });

  it('tap (immediate when double-tap is off)', () => {
    const r = new Rig(false);
    r.feed(raw(BIAS, [24, 0, -2700]), DT);
    r.feed(flat(), 400);
    expect(r.types()).toEqual(['TAP']);
    expect(r.events.find((e) => e.type === 'TAP')!.peakAccel).toBeGreaterThan(1.2);
  });

  it('tap waits for a possible second tap, then fires', () => {
    const r = new Rig(true);
    r.feed(raw(BIAS, [24, 0, -2700]), DT);
    r.feed(flat(), 300);
    expect(r.types()).toEqual([]);
    r.feed(flat(), 500);
    expect(r.types()).toEqual(['TAP']);
  });

  it('double tap', () => {
    const r = new Rig(true);
    r.feed(raw(BIAS, [24, 0, -2700]), DT);
    r.feed(flat(), 480);
    r.feed(raw(BIAS, [24, 0, -2700]), DT);
    r.feed(flat(), 900);
    expect(r.types()).toEqual(['DOUBLE_TAP']);
  });

  it('flip upside-down fires once until flipped back', () => {
    const r = new Rig();
    r.feed(raw(BIAS, [0, 0, 2050]), 1200);
    r.feed(flat(), 800);
    r.feed(raw(BIAS, [0, 0, 2050]), 1200);
    expect(r.types()).toEqual(['FLIP', 'FLIP']);
  });

  it('tilt & hold', () => {
    const r = new Rig();
    r.feed(raw(BIAS, [1025, 0, -1775]), 600);
    expect(r.types()[0]).toBe('TILT');
  });

  it('flat slide', () => {
    const r = new Rig();
    r.feed(raw(BIAS, [524, 0, -2050]), 150);
    r.feed(flat(), 300);
    expect(r.types()).toEqual(['SLIDE']);
  });

  it('button click, double click, hold', () => {
    const click = new Rig();
    click.feed(flat(true), 120);
    click.feed(flat(), 700);
    expect(click.types()).toEqual(['CLICK']);

    const dbl = new Rig();
    dbl.feed(flat(true), 100);
    dbl.feed(flat(), 100);
    dbl.feed(flat(true), 100);
    dbl.feed(flat(), 700);
    expect(dbl.types()).toEqual(['DOUBLE_CLICK']);

    const hold = new Rig();
    hold.feed(flat(true), 1000);
    hold.feed(flat(), 300);
    expect(hold.types()).toEqual(['HOLD']);
  });
});
