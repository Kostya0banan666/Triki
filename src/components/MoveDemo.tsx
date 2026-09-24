import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { GestureType } from '../gestures/types';
import { CapMascot } from './CapMascot';
import { T } from './theme';

const seq = Animated.sequence;
const t = (v: Animated.Value, toValue: number, duration: number, easing = Easing.inOut(Easing.quad)) =>
  Animated.timing(v, { toValue, duration, easing, useNativeDriver: true });
const wait = Animated.delay;

/**
 * Looping animation that shows how to perform a move with the cap.
 * One Animated.Value `p` drives everything so demos stay cheap.
 */
export function MoveDemo({ move, size = 92, playing = true }: { move: GestureType; size?: number; playing?: boolean }) {
  const p = useRef(new Animated.Value(0)).current;
  const q = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    p.setValue(0);
    q.setValue(0);
    if (!playing) return;
    let anim: Animated.CompositeAnimation;
    switch (move) {
      case 'TWIST_RIGHT':
      case 'TWIST_LEFT':
        anim = seq([wait(300), t(p, 1, 520), wait(350), t(p, 0, 700), wait(300)]);
        break;
      case 'TAP':
        anim = seq([wait(300), t(p, 1, 280), t(p, 2, 110, Easing.in(Easing.quad)), Animated.parallel([t(p, 0, 220), t(q, 1, 500, Easing.out(Easing.quad))]), t(q, 0, 1), wait(500)]);
        break;
      case 'DOUBLE_TAP':
        anim = seq([
          wait(250),
          t(p, 1, 220),
          t(p, 2, 100, Easing.in(Easing.quad)),
          Animated.parallel([t(p, 0, 180), t(q, 1, 380)]),
          t(q, 0, 1),
          t(p, 1, 200),
          t(p, 2, 100, Easing.in(Easing.quad)),
          Animated.parallel([t(p, 0, 180), t(q, 1, 380)]),
          t(q, 0, 1),
          wait(450),
        ]);
        break;
      case 'TILT':
        anim = seq([wait(300), t(p, 1, 500), wait(700), t(p, 0, 500), wait(300)]);
        break;
      case 'FLIP':
        anim = seq([wait(400), t(p, 1, 650), wait(700), t(p, 0, 650), wait(300)]);
        break;
      case 'SLIDE':
        anim = seq([wait(250), t(p, 1, 650, Easing.out(Easing.cubic)), wait(250), t(q, 1, 200), t(p, 0, 1), t(q, 0, 250), wait(250)]);
        break;
      case 'CLICK':
      case 'DOUBLE_CLICK':
      case 'HOLD': {
        const press = (hold: number) => seq([t(p, 1, 180), wait(hold), t(p, 0, 160)]);
        anim =
          move === 'CLICK'
            ? seq([wait(400), press(60), wait(700)])
            : move === 'DOUBLE_CLICK'
              ? seq([wait(400), press(40), wait(90), press(40), wait(700)])
              : seq([wait(400), press(900), wait(600)]);
        break;
      }
      default:
        anim = wait(1000);
    }
    const loop = Animated.loop(anim);
    loop.start();
    return () => loop.stop();
  }, [move, playing, p, q]);

  const box = size * 1.25;
  const capSize = size;
  let transform: any[] = [];
  let backOpacity: Animated.AnimatedInterpolation<number> | number = 0;
  let overlay: React.ReactNode = null;

  switch (move) {
    case 'TWIST_RIGHT':
    case 'TWIST_LEFT': {
      const dir = move === 'TWIST_RIGHT' ? 1 : -1;
      transform = [{ rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${dir * 80}deg`] }) }];
      overlay = (
        <MaterialCommunityIcons
          name={dir === 1 ? 'rotate-right' : 'rotate-left'}
          size={size * 0.34}
          color={T.cyan}
          style={{ position: 'absolute', top: 0, right: dir === 1 ? 0 : undefined, left: dir === 1 ? undefined : 0 }}
        />
      );
      break;
    }
    case 'TAP':
    case 'DOUBLE_TAP':
      transform = [
        { translateY: p.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -size * 0.2, size * 0.04] }) },
        { scaleY: p.interpolate({ inputRange: [0, 1, 1.9, 2], outputRange: [1, 1, 1, 0.9] }) },
      ];
      overlay = (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: size * 0.02,
            alignSelf: 'center',
            width: size * 1.1,
            height: size * 0.28,
            borderRadius: size,
            borderWidth: 2.5,
            borderColor: T.cyan,
            opacity: q.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 0] }),
            transform: [{ scale: q.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] }) }],
          }}
        />
      );
      break;
    case 'TILT':
      transform = [
        { perspective: 400 },
        { rotateX: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '48deg'] }) },
        { rotateZ: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-10deg'] }) },
      ];
      break;
    case 'FLIP':
      transform = [{ perspective: 400 }, { rotateY: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }];
      backOpacity = p.interpolate({ inputRange: [0, 0.49, 0.51, 1], outputRange: [0, 0, 1, 1] });
      break;
    case 'SLIDE':
      transform = [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.22, size * 0.22] }) }];
      overlay = (
        <Animated.View style={{ position: 'absolute', left: 0, top: size * 0.45, opacity: Animated.subtract(p, q) }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: size * (0.22 - i * 0.05), height: 3, borderRadius: 2, backgroundColor: T.cyan, marginBottom: 6 }} />
          ))}
        </Animated.View>
      );
      break;
    case 'CLICK':
    case 'DOUBLE_CLICK':
    case 'HOLD':
      transform = [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] }) }];
      overlay = (
        <Animated.View
          style={{
            position: 'absolute',
            alignSelf: 'center',
            top: -size * 0.08,
            transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.12, size * 0.08] }) }],
          }}
        >
          <MaterialCommunityIcons name="hand-pointing-down" size={size * 0.42} color={T.amber} />
        </Animated.View>
      );
      break;
  }

  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ width: capSize, height: capSize, transform }}>
        <CapMascot size={capSize} />
        {move === 'FLIP' ? (
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity: backOpacity }}>
            <CapMascot size={capSize} side="back" />
          </Animated.View>
        ) : null}
      </Animated.View>
      {overlay}
    </View>
  );
}
