import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../hooks/AppContext';
import { GESTURE_INFO, MAPPABLE_GESTURES, type GestureType } from '../gestures/types';
import { ACTION_LABEL } from '../profiles/profiles';
import { MoveDemo } from '../components/MoveDemo';
import { Badge, Card, Screen, T, Txt } from '../components/ui';

export function MovesScreen() {
  const { engine, status, profile } = useApp();
  const [done, setDone] = useState<Partial<Record<GestureType, number>>>({});
  const streaming = status.state === 'streaming';

  useEffect(
    () =>
      engine.on((e) => {
        if (e.repeat || !MAPPABLE_GESTURES.includes(e.type)) return;
        setDone((d) => ({ ...d, [e.type]: (d[e.type] ?? 0) + 1 }));
      }),
    [engine],
  );

  const count = MAPPABLE_GESTURES.filter((g) => done[g]).length;

  return (
    <Screen>
      <Txt weight="bold" style={{ fontSize: 30, color: T.cyan }}>
        Learn the moves
      </Txt>
      <Card>
        <Txt style={{ color: T.dim, lineHeight: 21 }}>
          The cap is round and has no compass, so it can’t tell “up” from “left”. Every move below works{' '}
          <Txt weight="bold" style={{ color: T.text }}>
            however the cap is turned
          </Txt>
          . Do one move at a time: twist <Txt weight="bold">or</Txt> tilt, not both.
        </Txt>
        <View style={{ marginTop: 14, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt weight="semibold">{streaming ? 'Practice: do each move once' : 'Connect the cap to practice'}</Txt>
            <Txt weight="bold" style={{ color: T.green }}>
              {count} / {MAPPABLE_GESTURES.length}
            </Txt>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: '#211A45', overflow: 'hidden' }}>
            <View style={{ width: `${(count / MAPPABLE_GESTURES.length) * 100}%`, height: '100%', backgroundColor: T.green, borderRadius: 4 }} />
          </View>
        </View>
      </Card>

      {MAPPABLE_GESTURES.map((g) => (
        <MoveCard key={g} move={g} times={done[g] ?? 0} action={profile.mappings[g]} profileName={profile.name} />
      ))}
    </Screen>
  );
}

function MoveCard({
  move,
  times,
  action,
  profileName,
}: {
  move: GestureType;
  times: number;
  action?: string;
  profileName: string;
}) {
  const info = GESTURE_INFO[move];
  const glow = useRef(new Animated.Value(0)).current;

  // flash green every time the move is detected
  useEffect(() => {
    if (!times) return;
    glow.setValue(1);
    Animated.timing(glow, { toValue: 0, duration: 1200, useNativeDriver: false }).start();
  }, [times, glow]);

  const borderColor = glow.interpolate({ inputRange: [0, 1], outputRange: [times ? T.green + '66' : T.cardBorder, T.green] });
  const mapped = action && action !== 'NONE' ? ACTION_LABEL[action as keyof typeof ACTION_LABEL] : null;

  return (
    <Animated.View style={{ borderRadius: 26, borderWidth: 2, borderColor, backgroundColor: T.card, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <MoveDemo move={move} size={84} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt weight="bold" style={{ fontSize: 19 }}>
            {info.label}
          </Txt>
          {times ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="check-circle" size={18} color={T.green} />
              <Txt weight="bold" style={{ color: T.green }}>
                ×{times}
              </Txt>
            </View>
          ) : (
            <Badge label="try it" color={T.cyan} />
          )}
        </View>
        <Txt style={{ fontSize: 14, lineHeight: 19 }}>{info.how}</Txt>
        {info.tip ? <Txt style={{ color: T.dim, fontSize: 13, lineHeight: 18 }}>{info.tip}</Txt> : null}
        <Txt weight="semibold" style={{ color: mapped ? T.green : T.faint, fontSize: 13, marginTop: 2 }}>
          {profileName}: {mapped ?? 'not used'}
        </Txt>
      </View>
    </Animated.View>
  );
}
