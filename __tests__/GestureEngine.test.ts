import { GestureEngine } from '../src/gestures/GestureEngine';
import type { GestureType } from '../src/gestures/types';
import type { TrikiFrame } from '../src/types/triki';

const still = (button = false): TrikiFrame => ({ button, gyro: { x: 0, y: 0, z: 0 }, accel: { x: 0, y: 0, z: 1 } });
const rot = (x: number, y: number, z: number): TrikiFrame => ({ button: false, gyro: { x, y, z }, accel: { x: 0, y: 0, z: 1 } });

function run(frames: [TrikiFrame, number][]): GestureType[] {
  const e = new GestureEngine();
  const out: GestureType[] = [];
  e.on((g) => out.push(g.type));
  for (const [f, t] of frames) e.process(f, t);
  return out;
}

const series = (from: number, to: number, f: TrikiFrame, step = 10): [TrikiFrame, number][] => {
  const r: [TrikiFrame, number][] = [];
  for (let t = from; t < to; t += step) r.push([f, t]);
  return r;
};

describe('GestureEngine', () => {
  it('single click after the double-click window', () => {
    const out = run([...series(0, 100, still()), ...series(100, 200, still(true)), ...series(200, 800, still())]);
    expect(out).toEqual(['BUTTON_PRESS', 'BUTTON_RELEASE', 'SINGLE_CLICK']);
  });

  it('double click', () => {
    const out = run([
      ...series(0, 100, still(true)),
      ...series(100, 200, still()),
      ...series(200, 300, still(true)),
      ...series(300, 900, still()),
    ]);
    expect(out.filter((g) => !g.startsWith('BUTTON'))).toEqual(['DOUBLE_CLICK']);
  });

  it('hold', () => {
    const out = run([...series(0, 1000, still(true)), ...series(1000, 1500, still())]);
    expect(out).toEqual(['BUTTON_PRESS', 'HOLD', 'BUTTON_RELEASE']);
  });

  it('flicks and twists by dominant axis', () => {
    const burst = (f: TrikiFrame) => run([...series(0, 100, still()), ...series(100, 200, f), ...series(200, 400, still())]);
    expect(burst(rot(400, 0, 0))).toContain('FLICK_UP');
    expect(burst(rot(-400, 0, 0))).toContain('FLICK_DOWN');
    expect(burst(rot(0, 0, 400))).toContain('FLICK_RIGHT');
    expect(burst(rot(0, 0, -400))).toContain('FLICK_LEFT');
    expect(burst(rot(0, 500, 0))).toContain('TWIST_CW');
    expect(burst(rot(0, -500, 0))).toContain('TWIST_CCW');
  });

  it('knock', () => {
    const spike: TrikiFrame = { button: false, gyro: { x: 0, y: 0, z: 0 }, accel: { x: 2.5, y: 0, z: 1 } };
    const out = run([...series(0, 200, still()), [spike, 200], ...series(210, 400, still())]);
    expect(out).toContain('KNOCK');
  });
});
