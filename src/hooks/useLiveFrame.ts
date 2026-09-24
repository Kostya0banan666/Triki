import { useEffect, useRef, useState } from 'react';
import { triki } from '../bluetooth/TrikiBLE';
import type { TrikiFrame } from '../types/triki';

/**
 * Latest frame, sampled at `hz` (default 15). Frames arrive at ~100 Hz; only
 * the component using this hook re-renders, and only at the sampling rate.
 */
export function useLiveFrame(hz = 15): { frame: TrikiFrame | null; fps: number } {
  const latest = useRef<TrikiFrame | null>(null);
  const count = useRef(0);
  const [state, setState] = useState<{ frame: TrikiFrame | null; fps: number }>({ frame: null, fps: 0 });

  useEffect(() => {
    const off = triki.onFrame((f) => {
      latest.current = f;
      count.current++;
    });
    let lastFpsAt = Date.now();
    let fps = 0;
    const iv = setInterval(() => {
      const now = Date.now();
      if (now - lastFpsAt >= 1000) {
        fps = Math.round((count.current * 1000) / (now - lastFpsAt));
        count.current = 0;
        lastFpsAt = now;
      }
      if (latest.current) setState({ frame: latest.current, fps });
    }, 1000 / hz);
    return () => {
      off();
      clearInterval(iv);
    };
  }, [hz]);

  return state;
}
