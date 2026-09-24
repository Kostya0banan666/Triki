import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { triki } from '../bluetooth/TrikiBLE';
import { ACCEL_SCALE, GYRO_SCALE } from '../bluetooth/TrikiFrameParser';
import { useApp } from '../hooks/AppContext';
import type { MotionState } from '../gestures/types';
import type { TrikiFrame } from '../types/triki';
import { T, Txt } from './ui';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

interface Snapshot {
  frame: TrikiFrame | null;
  state: MotionState;
  hz: number;
}

/** Samples the live stream at `hz` so only this subtree re-renders. */
export function useLiveSnapshot(hz = 12): Snapshot {
  const { engine } = useApp();
  const latest = useRef<TrikiFrame | null>(null);
  const count = useRef(0);
  const [snap, setSnap] = useState<Snapshot>({ frame: null, state: engine.state, hz: 0 });
  useEffect(() => {
    const off = triki.onFrame((f) => {
      latest.current = f;
      count.current++;
    });
    let lastHz = Date.now();
    let rate = 0;
    const iv = setInterval(() => {
      const now = Date.now();
      if (now - lastHz >= 1000) {
        rate = Math.round((count.current * 1000) / (now - lastHz));
        count.current = 0;
        lastHz = now;
      }
      setSnap({ frame: latest.current, state: engine.state, hz: rate });
    }, 1000 / hz);
    return () => {
      off();
      clearInterval(iv);
    };
  }, [engine, hz]);
  return snap;
}

function Tile({ label, value, range, color }: { label: string; value: number | null; range: number; color: string }) {
  const pos = value == null ? 0.5 : clamp01(0.5 + value / (2 * range));
  return (
    <View
      style={{
        flexBasis: '31%',
        flexGrow: 1,
        backgroundColor: T.inset,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: T.insetBorder,
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Txt weight="bold" style={{ color: T.dim, fontSize: 11, letterSpacing: 1.6 }}>
        {label}
      </Txt>
      <Txt weight="bold" style={{ fontSize: 18, fontVariant: ['tabular-nums'] }}>
        {value == null ? '—' : `${value > 0 ? '+' : ''}${Math.round(value)}`}
      </Txt>
      <View style={{ width: '100%', height: 6, borderRadius: 3, backgroundColor: '#211A45' }}>
        <View style={{ position: 'absolute', left: '50%', width: 1, height: 6, backgroundColor: T.faint }} />
        <View
          style={{
            position: 'absolute',
            left: `${pos * 100}%`,
            marginLeft: -2,
            width: 4,
            height: 6,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

/** POWER bar + six raw channels, like the desktop TRIKI Control. */
export function LiveMeters() {
  const { frame, state, hz } = useLiveSnapshot(12);
  const g = frame ? [frame.gyro.x * GYRO_SCALE, frame.gyro.y * GYRO_SCALE, frame.gyro.z * GYRO_SCALE] : null;
  const a = frame ? [frame.accel.x * ACCEL_SCALE, frame.accel.y * ACCEL_SCALE, frame.accel.z * ACCEL_SCALE] : null;
  const accelDev = a ? Math.abs(Math.hypot(a[0], a[1], a[2]) - 2050) : 0;
  const power = frame ? clamp01(Math.max(state.spin / 3000, accelDev / 900, state.strength * 0.8)) : 0;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Txt weight="bold" style={{ color: T.dim, fontSize: 13, letterSpacing: 2.4 }}>
          POWER
        </Txt>
        <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: '#211A45', overflow: 'hidden' }}>
          <LinearGradient
            colors={[T.cyan, T.purple, T.magenta]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: `${Math.max(3, power * 100)}%`, height: '100%', borderRadius: 5 }}
          />
        </View>
        <Txt style={{ color: T.faint, fontSize: 12, width: 48, textAlign: 'right' }}>{hz ? `${hz} Hz` : ''}</Txt>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Tile label="SPIN X" value={g?.[0] ?? null} range={3000} color={T.magenta} />
        <Tile label="SPIN Y" value={g?.[1] ?? null} range={3000} color={T.magenta} />
        <Tile label="TURN Z" value={g?.[2] ?? null} range={3000} color={T.magenta} />
        <Tile label="TILT X" value={a?.[0] ?? null} range={2400} color={T.cyan} />
        <Tile label="TILT Y" value={a?.[1] ?? null} range={2400} color={T.cyan} />
        <Tile label="FLIP Z" value={a?.[2] ?? null} range={2400} color={T.cyan} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
        <Legend color={T.magenta} label="gyro (spin)" />
        <Legend color={T.cyan} label="accel (tilt)" />
        <Legend color={frame?.button ? T.green : T.faint} label={frame?.button ? 'button DOWN' : 'button'} />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
      <Txt style={{ color: T.dim, fontSize: 12 }}>{label}</Txt>
    </View>
  );
}
