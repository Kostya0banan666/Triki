import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

export type Mood = 'neutral' | 'happy' | 'surprised' | 'dizzy' | 'squint' | 'sleep';

const TEETH = 21;

/** Crown-cap outline: rounded pleats with sharp valleys. */
function crimpPath(cx: number, cy: number, rValley: number, rPeak: number): string {
  const at = (a: number, r: number) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  const d: string[] = [];
  for (let i = 0; i < TEETH; i++) {
    const a0 = (i / TEETH) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / TEETH) * Math.PI * 2 - Math.PI / 2;
    const span = a1 - a0;
    if (i === 0) d.push(`M${at(a0, rValley)}`);
    d.push(`C${at(a0 + span * 0.18, rPeak)} ${at(a1 - span * 0.18, rPeak)} ${at(a1, rValley)}`);
  }
  return `${d.join(' ')} Z`;
}

const CRIMP = crimpPath(100, 100, 87, 103);

/** The cap body without a face (so the face can move separately for parallax). */
export const CapBody = memo(function CapBody({
  size,
  side = 'front',
  led = false,
}: {
  size: number;
  side?: 'front' | 'back';
  led?: boolean;
}) {
  const back = side === 'back';
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id={`crimp-${side}`} cx="50%" cy="45%" r="55%">
          <Stop offset="0.75" stopColor={back ? '#C9CAD6' : '#F1F1F6'} />
          <Stop offset="1" stopColor={back ? '#8E8FA3' : '#B9BACB'} />
        </RadialGradient>
        <RadialGradient id={`face-${side}`} cx="42%" cy="36%" r="70%">
          <Stop offset="0" stopColor={back ? '#D8D9E3' : '#FFFFFF'} />
          <Stop offset="0.8" stopColor={back ? '#B3B4C4' : '#F1F1F7'} />
          <Stop offset="1" stopColor={back ? '#9C9DB1' : '#DCDCE7'} />
        </RadialGradient>
        <RadialGradient id="ledglow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#4DE3F0" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#4DE3F0" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Path d={CRIMP} fill={`url(#crimp-${side})`} stroke={back ? '#A5A6B8' : '#D7D8E4'} strokeWidth={3} strokeLinejoin="round" />
      <Circle cx={100} cy={100} r={80} fill={`url(#face-${side})`} stroke={back ? '#8F90A6' : '#D2D3E0'} strokeWidth={3} />
      {back ? (
        <G opacity={0.55}>
          <Circle cx={100} cy={100} r={64} fill="none" stroke="#8F90A6" strokeWidth={2} />
          <Circle cx={100} cy={100} r={44} fill="none" stroke="#8F90A6" strokeWidth={2} />
          <Circle cx={100} cy={100} r={20} fill="#9FA0B4" />
        </G>
      ) : (
        <Ellipse cx={78} cy={66} rx={30} ry={16} fill="#FFFFFF" opacity={0.55} transform="rotate(-25 78 66)" />
      )}
      {!back ? (
        <G>
          {led ? <Circle cx={100} cy={13} r={16} fill="url(#ledglow)" /> : null}
          <Circle cx={100} cy={13} r={7.5} fill="#10223A" />
          <Circle cx={100} cy={13} r={5} fill={led ? '#8FF6FF' : '#4DE3F0'} />
        </G>
      ) : null}
    </Svg>
  );
});

/** Face drawn in the same 200x200 space; render it over CapBody. */
export const CapFace = memo(function CapFace({ size, mood = 'neutral', blink = false }: { size: number; mood?: Mood; blink?: boolean }) {
  const eyeRy = blink || mood === 'squint' || mood === 'sleep' ? 2.5 : 14;
  const eyeY = 88;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {mood === 'dizzy' ? (
        <G stroke="#16132B" strokeWidth={5} strokeLinecap="round" fill="none">
          <Path d="M64 88 m-10 0 a10 10 0 1 0 20 0 a6 6 0 1 0 -12 0" />
          <Path d="M136 88 m-10 0 a10 10 0 1 0 20 0 a6 6 0 1 0 -12 0" />
        </G>
      ) : (
        <G>
          <Ellipse cx={72} cy={eyeY} rx={13} ry={eyeRy} fill="#16132B" />
          <Ellipse cx={128} cy={eyeY} rx={13} ry={eyeRy} fill="#16132B" />
          {eyeRy > 5 ? (
            <>
              <Circle cx={76} cy={82} r={3.5} fill="#FFFFFF" />
              <Circle cx={132} cy={82} r={3.5} fill="#FFFFFF" />
            </>
          ) : null}
        </G>
      )}
      {mood === 'happy' ? (
        <Path d="M78 120 Q100 142 122 120" stroke="#16132B" strokeWidth={6} strokeLinecap="round" fill="none" />
      ) : mood === 'surprised' ? (
        <Ellipse cx={100} cy={126} rx={10} ry={12} fill="#16132B" />
      ) : mood === 'dizzy' ? (
        <Path d="M80 126 Q90 118 100 126 T120 126" stroke="#16132B" strokeWidth={5} strokeLinecap="round" fill="none" />
      ) : mood === 'sleep' ? (
        <Path d="M88 126 L112 126" stroke="#16132B" strokeWidth={5} strokeLinecap="round" />
      ) : (
        <Path d="M80 126 L120 126" stroke="#16132B" strokeWidth={6} strokeLinecap="round" />
      )}
    </Svg>
  );
});

/** Static cap with face, for small uses (icons, demos). */
export function CapMascot({ size, mood = 'neutral', side = 'front', led }: { size: number; mood?: Mood; side?: 'front' | 'back'; led?: boolean }) {
  return (
    <View style={{ width: size, height: size }}>
      <CapBody size={size} side={side} led={led} />
      {side === 'front' ? (
        <View style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <CapFace size={size} mood={mood} />
        </View>
      ) : null}
    </View>
  );
}
