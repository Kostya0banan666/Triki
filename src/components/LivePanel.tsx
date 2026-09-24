import React from 'react';
import { Text, View } from 'react-native';
import { useLiveFrame } from '../hooks/useLiveFrame';
import type { Vec3 } from '../types/triki';
import { C, Card, s } from './ui';

function Axes({ title, v, unit, digits }: { title: string; v: Vec3 | undefined; unit: string; digits: number }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.cardTitle}>{title}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {(['x', 'y', 'z'] as const).map((k) => (
          <View key={k} style={{ flex: 1 }}>
            <Text style={s.dim}>{k.toUpperCase()}</Text>
            <Text style={s.mono}>{v ? v[k].toFixed(digits) : '—'}</Text>
          </View>
        ))}
      </View>
      <Text style={s.dim}>{unit}</Text>
    </View>
  );
}

/** Only this component re-renders for live data (15 Hz). */
export function LivePanel() {
  const { frame, fps } = useLiveFrame(15);
  const pressed = frame?.button ?? false;
  return (
    <Card title={`LIVE CONTROLLER  ·  ${fps} Hz`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={s.cardTitle}>BUTTON</Text>
        <Text style={{ color: pressed ? C.accent : C.dim, fontWeight: '800', fontSize: 17 }}>
          {frame ? (pressed ? 'Pressed' : 'Released') : '—'}
        </Text>
      </View>
      <Axes title="GYROSCOPE" v={frame?.gyro} unit="°/s" digits={1} />
      <Axes title="ACCELEROMETER" v={frame?.accel} unit="g" digits={2} />
    </Card>
  );
}
