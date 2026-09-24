import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { triki } from '../bluetooth/TrikiBLE';
import { useApp } from '../hooks/AppContext';
import type { GestureEvent } from '../gestures/types';
import type { TrikiFrame } from '../types/triki';
import { CapBody, CapFace, type Mood } from './CapMascot';
import { T, Txt } from './ui';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const MOOD_FOR: Partial<Record<GestureEvent['type'], Mood>> = {
  TAP: 'surprised',
  DOUBLE_TAP: 'surprised',
  TWIST_LEFT: 'dizzy',
  TWIST_RIGHT: 'dizzy',
  SLIDE: 'happy',
  TILT: 'happy',
  CLICK: 'squint',
  DOUBLE_CLICK: 'squint',
  HOLD: 'squint',
};

/** Arc from angle a0 to a1 (degrees, 0 = up, clockwise) with an arrow head at a1. */
function arcArrow(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number, rr = r) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return [cx + rr * Math.cos(rad), cy + rr * Math.sin(rad)];
  };
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const sweep = a1 > a0 ? 1 : 0;
  const dir = a1 > a0 ? -1 : 1;
  const [hx1, hy1] = p(a1 + dir * 9, r + 9);
  const [hx2, hy2] = p(a1 + dir * 9, r - 9);
  return `M${x0} ${y0} A${r} ${r} 0 0 ${sweep} ${x1} ${y1} M${hx1} ${hy1} L${x1} ${y1} L${hx2} ${hy2}`;
}

/** Live, animated cap that mirrors what the real cap is doing. */
export function CapStage({ led }: { led: boolean }) {
  const { engine, status } = useApp();
  const { width } = useWindowDimensions();
  const stage = Math.min(width - 32 - 38, 360);
  const cap = Math.round(stage * 0.5);

  const rot = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const latest = useRef<TrikiFrame | null>(null);
  const [mood, setMood] = useState<Mood>('neutral');
  const [blink, setBlink] = useState(false);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [twistDir, setTwistDir] = useState<0 | 1 | -1>(0);
  const live = status.state === 'streaming';

  useEffect(() => triki.onFrame((f) => (latest.current = f)), []);

  // 30 fps animation loop driven by the latest frame (no React re-render)
  useEffect(() => {
    let angle = 0;
    let last = Date.now();
    let sideNow: 'front' | 'back' = 'front';
    const iv = setInterval(() => {
      const f = latest.current;
      if (!f) return;
      const now = Date.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const st = engine.state;
      if (Math.abs(st.twist) > 250) angle += (st.twist / 16.4) * dt;
      else angle *= 0.9;
      angle = clamp(angle, -720, 720);
      rot.setValue(angle);
      tx.setValue(clamp(f.accel.x * 60, -34, 34));
      ty.setValue(clamp(-f.accel.y * 60, -34, 34));
      const s2 = f.accel.z > 0.45 ? 'back' : 'front';
      if (s2 !== sideNow) {
        sideNow = s2;
        setSide(s2);
      }
    }, 33);
    return () => clearInterval(iv);
  }, [engine, rot, tx, ty]);

  // expressions
  useEffect(() => {
    let moodTimer: ReturnType<typeof setTimeout> | undefined;
    const off = engine.on((e) => {
      if (e.repeat) return;
      const m = MOOD_FOR[e.type];
      if (m) {
        setMood(m);
        clearTimeout(moodTimer);
        moodTimer = setTimeout(() => {
          setMood('neutral');
          setTwistDir(0);
        }, 900);
      }
      if (e.type === 'TWIST_RIGHT') setTwistDir(1);
      if (e.type === 'TWIST_LEFT') setTwistDir(-1);
      if (e.type === 'TAP' || e.type === 'DOUBLE_TAP' || e.type === 'CLICK') {
        bounce.setValue(0.86);
        ring.setValue(0);
        Animated.parallel([
          Animated.spring(bounce, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }),
          Animated.timing(ring, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start();
      }
    });
    const blinker = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 130);
    }, 3800);
    return () => {
      off();
      clearTimeout(moodTimer);
      clearInterval(blinker);
    };
  }, [engine, bounce, ring]);

  const c = stage / 2;
  const spin = rot.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });
  const tiltX = ty.interpolate({ inputRange: [-34, 34], outputRange: ['18deg', '-18deg'] });
  const tiltY = tx.interpolate({ inputRange: [-34, 34], outputRange: ['-18deg', '18deg'] });

  return (
    <View
      style={{
        width: stage,
        height: stage,
        alignSelf: 'center',
        borderRadius: 26,
        backgroundColor: T.inset,
        borderWidth: 1,
        borderColor: T.insetBorder,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Svg width={stage} height={stage} style={{ position: 'absolute' }}>
        <Circle cx={c} cy={c} r={stage * 0.47} stroke={T.purple} strokeOpacity={0.22} strokeDasharray="3 7" fill="none" />
        <Circle cx={c} cy={c} r={stage * 0.39} stroke={T.purple} strokeOpacity={0.35} strokeWidth={2} fill="none" />
        <Circle cx={c} cy={c} r={stage * 0.33} stroke={T.purple} strokeOpacity={0.14} strokeWidth={10} fill="none" />
        <Path
          d={arcArrow(c, c, stage * 0.43, 20, 80)}
          stroke={twistDir === 1 ? T.cyan : T.purple}
          strokeOpacity={twistDir === 1 ? 1 : 0.35}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d={arcArrow(c, c, stage * 0.43, -20, -80)}
          stroke={twistDir === -1 ? T.cyan : T.purple}
          strokeOpacity={twistDir === -1 ? 1 : 0.35}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>

      {/* tap impact ring */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: cap * 1.2,
          height: cap * 1.2,
          borderRadius: cap,
          borderWidth: 3,
          borderColor: T.cyan,
          opacity: ring.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.9, 0] }),
          transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.7] }) }],
        }}
      />

      <Animated.View
        style={{
          width: cap,
          height: cap,
          opacity: live ? 1 : 0.55,
          transform: [
            { perspective: 700 },
            { translateX: tx },
            { translateY: ty },
            { rotateX: tiltX },
            { rotateY: tiltY },
            { scale: bounce },
          ],
        }}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <CapBody size={cap} side={side} led={led} />
          {side === 'front' ? (
            <View style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
              <CapFace size={cap} mood={live ? mood : 'sleep'} blink={blink} />
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>

      <Txt weight="semibold" style={{ position: 'absolute', left: 18, bottom: 14, color: T.dim, fontSize: 14 }}>
        {live ? 'Twist, tilt, tap or flip the cap!' : 'Connect your cap to wake me up'}
      </Txt>
    </View>
  );
}
