import type { TrikiFrame } from '../types/triki';

export const FRAME_HEADER = 0x22;
export const FRAME_LENGTH = 14;
export const GYRO_SCALE = 131.0;
export const ACCEL_SCALE = 2048.0;
const MAX_BUFFER = 4096;

function int16le(b: Uint8Array, i: number): number {
  const v = b[i] | (b[i + 1] << 8);
  return v & 0x8000 ? v - 0x10000 : v;
}

/** Decodes one 14-byte frame starting at `offset`. Returns null if it is not a valid frame. */
export function decodeFrame(b: Uint8Array, offset = 0): TrikiFrame | null {
  if (b.length - offset < FRAME_LENGTH || b[offset] !== FRAME_HEADER) return null;
  const btn = b[offset + 1];
  if (btn !== 0x00 && btn !== 0x01) return null;
  return {
    button: btn === 0x01,
    gyro: {
      x: int16le(b, offset + 2) / GYRO_SCALE,
      y: int16le(b, offset + 4) / GYRO_SCALE,
      z: int16le(b, offset + 6) / GYRO_SCALE,
    },
    accel: {
      x: int16le(b, offset + 8) / ACCEL_SCALE,
      y: int16le(b, offset + 10) / ACCEL_SCALE,
      z: int16le(b, offset + 12) / ACCEL_SCALE,
    },
  };
}

/**
 * Persistent byte-stream parser. BLE notification boundaries are NOT frame
 * boundaries, so bytes are accumulated across calls and frames are extracted by
 * scanning for the 0x22 header followed by a button byte of 0x00 or 0x01.
 *
 * Resync: a 0x22 can appear inside sensor data. When a candidate's successor
 * position (offset + 14) is already received and is not a header, and a better
 * aligned header exists before it, the candidate is skipped.
 */
export class TrikiFrameParser {
  private buf = new Uint8Array(0);
  droppedBytes = 0;
  framesDecoded = 0;

  reset(): void {
    this.buf = new Uint8Array(0);
    this.droppedBytes = 0;
    this.framesDecoded = 0;
  }

  get bufferedBytes(): number {
    return this.buf.length;
  }

  push(chunk: Uint8Array): TrikiFrame[] {
    const merged = new Uint8Array(this.buf.length + chunk.length);
    merged.set(this.buf, 0);
    merged.set(chunk, this.buf.length);

    const frames: TrikiFrame[] = [];
    let i = 0;
    while (i < merged.length) {
      const isCandidate =
        merged[i] === FRAME_HEADER && (i + 1 >= merged.length || merged[i + 1] <= 0x01);
      if (!isCandidate) {
        i++;
        this.droppedBytes++;
        continue;
      }
      if (merged.length - i < FRAME_LENGTH) break; // wait for more bytes
      const next = i + FRAME_LENGTH;
      if (
        next < merged.length &&
        merged[next] !== FRAME_HEADER &&
        this.hasAlignedHeader(merged, i + 1, next)
      ) {
        i++;
        this.droppedBytes++;
        continue;
      }
      const f = decodeFrame(merged, i);
      if (f) {
        frames.push(f);
        this.framesDecoded++;
        i = next;
      } else {
        i++;
        this.droppedBytes++;
      }
    }

    this.buf = merged.slice(i);
    if (this.buf.length > MAX_BUFFER) {
      this.droppedBytes += this.buf.length - FRAME_LENGTH;
      this.buf = this.buf.slice(this.buf.length - FRAME_LENGTH);
    }
    return frames;
  }

  /** Is there a header in [from, to] whose own successor lines up (or is not received yet)? */
  private hasAlignedHeader(b: Uint8Array, from: number, to: number): boolean {
    for (let j = from; j <= to && j < b.length; j++) {
      if (b[j] !== FRAME_HEADER) continue;
      if (j + 1 < b.length && b[j + 1] > 0x01) continue;
      const n = j + FRAME_LENGTH;
      if (n >= b.length || b[n] === FRAME_HEADER) return true;
    }
    return false;
  }
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

export function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}
