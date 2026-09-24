import { TrikiFrameParser, decodeFrame, hexToBytes, FRAME_LENGTH } from '../src/bluetooth/TrikiFrameParser';

function frame(button: 0 | 1, g: [number, number, number], a: [number, number, number]): number[] {
  const out = [0x22, button];
  for (const v of [...g, ...a]) {
    const u = v & 0xffff;
    out.push(u & 0xff, (u >> 8) & 0xff);
  }
  return out;
}

describe('decodeFrame', () => {
  it('decodes scaling and signed little-endian values', () => {
    const f = decodeFrame(Uint8Array.from(frame(1, [131, -131, 262], [2048, -2048, 0])))!;
    expect(f.button).toBe(true);
    expect(f.gyro).toEqual({ x: 1, y: -1, z: 2 });
    expect(f.accel.x).toBe(1);
    expect(f.accel.y).toBe(-1);
    expect(f.accel.z).toBe(0);
  });

  it('rejects wrong header, invalid button byte, short input', () => {
    const b = frame(0, [0, 0, 0], [0, 0, 0]);
    expect(decodeFrame(Uint8Array.from([0x21, ...b.slice(1)]))).toBeNull();
    expect(decodeFrame(Uint8Array.from([0x22, 0x05, ...b.slice(2)]))).toBeNull();
    expect(decodeFrame(Uint8Array.from(b.slice(0, 10)))).toBeNull();
  });
});

describe('TrikiFrameParser', () => {
  it('reconstructs the fragmented example from the spec', () => {
    const p = new TrikiFrameParser();
    expect(p.push(hexToBytes('AA BB 22 00 01 02'))).toHaveLength(0);
    expect(p.push(hexToBytes('03 04 05 06 07 08 09 0A'))).toHaveLength(0);
    const out = p.push(hexToBytes('0B 0C 22 01'));
    expect(out).toHaveLength(1);
    expect(out[0].button).toBe(false);
    expect(out[0].gyro.x).toBeCloseTo(0x0201 / 131);
    expect(out[0].accel.z).toBeCloseTo(0x0c0b / 2048);
    expect(p.bufferedBytes).toBe(2); // "22 01" waits for the rest
    const out2 = p.push(Uint8Array.from(frame(1, [10, 20, 30], [40, 50, 60]).slice(2)));
    expect(out2).toHaveLength(1);
    expect(out2[0].button).toBe(true);
    expect(out2[0].gyro.z).toBeCloseTo(30 / 131);
  });

  it('handles multiple frames in one notification, including pressed (22 01) frames', () => {
    const p = new TrikiFrameParser();
    const bytes = [
      ...frame(0, [1, 2, 3], [4, 5, 6]),
      ...frame(1, [-1, -2, -3], [7, 8, 9]),
      ...frame(1, [0, 0, 0], [0, 0, 2048]),
    ];
    const out = p.push(Uint8Array.from(bytes));
    expect(out.map((f) => f.button)).toEqual([false, true, true]);
    expect(out[2].accel.z).toBe(1);
  });

  it('handles every possible split point', () => {
    const stream = [0x99, ...frame(0, [100, -200, 300], [-400, 500, -600]), ...frame(1, [7, 8, 9], [10, 11, 12])];
    for (let cut = 0; cut <= stream.length; cut++) {
      const p = new TrikiFrameParser();
      const out = [...p.push(Uint8Array.from(stream.slice(0, cut))), ...p.push(Uint8Array.from(stream.slice(cut)))];
      expect(out).toHaveLength(2);
      expect(out[0].gyro.y).toBeCloseTo(-200 / 131);
      expect(out[1].button).toBe(true);
    }
  });

  it('handles byte-by-byte delivery', () => {
    const p = new TrikiFrameParser();
    const stream = [...frame(1, [1, 1, 1], [1, 1, 1]), ...frame(0, [2, 2, 2], [2, 2, 2])];
    let n = 0;
    for (const b of stream) n += p.push(Uint8Array.of(b)).length;
    expect(n).toBe(2);
  });

  it('resyncs past a false 0x22 00 in leading garbage', () => {
    const p = new TrikiFrameParser();
    const stream = [
      0x22, 0x00, 0x13, 0x37,
      ...frame(0, [0x22, 0x22, 0], [0, 0, 0]),
      ...frame(1, [5, 5, 5], [0, 0, 0]),
      ...frame(0, [0, 0, 0], [0, 0, 0]),
    ];
    const out = p.push(Uint8Array.from(stream));
    expect(out).toHaveLength(3);
    expect(out.map((f) => f.button)).toEqual([false, true, false]);
    expect(out[1].gyro.x).toBeCloseTo(5 / 131);
  });

  it('frame length is 14', () => expect(FRAME_LENGTH).toBe(14));
});
