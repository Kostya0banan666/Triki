import React, { useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { isSystemServiceEnabled, openAccessibilitySettings, systemControlSupported } from '../system/SystemControl';
import { useApp } from '../hooks/AppContext';
import { DEFAULT_THRESHOLDS, type Axis, type AxisMap, type GestureThresholds } from '../gestures/types';
import { Btn, C, Card, s } from '../components/ui';

type NumKey = { [K in keyof GestureThresholds]: GestureThresholds[K] extends number ? K : never }[keyof GestureThresholds];

const NUMERIC: { key: NumKey; label: string; step: number; unit: string }[] = [
  { key: 'flickRate', label: 'Flick sensitivity (min rate)', step: 20, unit: '°/s' },
  { key: 'twistRate', label: 'Twist min rate', step: 20, unit: '°/s' },
  { key: 'motionMaxMs', label: 'Max flick/twist duration', step: 50, unit: 'ms' },
  { key: 'knockG', label: 'Knock threshold', step: 0.1, unit: 'g' },
  { key: 'tiltDeg', label: 'Tilt angle', step: 5, unit: '°' },
  { key: 'clickMaxMs', label: 'Click max press', step: 25, unit: 'ms' },
  { key: 'doubleClickGapMs', label: 'Double-click gap', step: 25, unit: 'ms' },
  { key: 'holdMs', label: 'Hold time', step: 50, unit: 'ms' },
  { key: 'cooldownMs', label: 'Cooldown between gestures', step: 50, unit: 'ms' },
];

const AXES: { key: 'upDown' | 'leftRight' | 'twist'; label: string }[] = [
  { key: 'upDown', label: 'Flick up/down gyro axis' },
  { key: 'leftRight', label: 'Flick left/right gyro axis' },
  { key: 'twist', label: 'Twist gyro axis' },
];

function Stepper({ label, value, unit, onChange, step }: { label: string; value: number; unit: string; step: number; onChange: (v: number) => void }) {
  const fmt = step < 1 ? value.toFixed(1) : String(Math.round(value));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={[s.text, { flex: 1 }]}>{label}</Text>
      <Pressable onPress={() => onChange(Math.max(step, value - step))} hitSlop={8}>
        <Text style={{ color: C.blue, fontSize: 24, paddingHorizontal: 10 }}>−</Text>
      </Pressable>
      <Text style={[s.text, { width: 76, textAlign: 'center', fontVariant: ['tabular-nums'] }]}>
        {fmt} {unit}
      </Text>
      <Pressable onPress={() => onChange(value + step)} hitSlop={8}>
        <Text style={{ color: C.blue, fontSize: 24, paddingHorizontal: 10 }}>+</Text>
      </Pressable>
    </View>
  );
}

export function SettingsScreen() {
  const { thresholds: t, setThresholds, systemControl, setSystemControl } = useApp();
  const [serviceOn, setServiceOn] = useState(isSystemServiceEnabled());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setServiceOn(isSystemServiceEnabled()));
    return () => sub.remove();
  }, []);
  const setAxis = (k: (typeof AXES)[number]['key'], m: AxisMap) => setThresholds({ ...t, [k]: m });

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.h1}>Settings</Text>
      {systemControlSupported ? (
        <Card title="CONTROL OTHER APPS (ANDROID)">
          <Text style={s.dim}>
            Swipes/taps in TikTok, Shorts, Reels etc. using the active profile. Works while this app is in the background.
          </Text>
          <Text style={{ color: serviceOn ? C.accent : C.amber, fontWeight: '700' }}>
            ● Accessibility service {serviceOn ? 'enabled' : 'disabled'}
          </Text>
          {!serviceOn ? (
            <Btn label="Open Accessibility settings" kind="primary" onPress={openAccessibilitySettings} />
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={s.text}>System control</Text>
            <Switch value={systemControl} onValueChange={setSystemControl} />
          </View>
        </Card>
      ) : null}
      <Card title="GESTURE THRESHOLDS">
        {NUMERIC.map((n) => (
          <Stepper key={n.key} label={n.label} value={t[n.key]} unit={n.unit} step={n.step} onChange={(v) => setThresholds({ ...t, [n.key]: Math.round(v * 100) / 100 })} />
        ))}
      </Card>
      <Card title="AXIS MAPPING">
        <Text style={s.dim}>Flick the controller and watch the gyro values on the Debug tab to see which axis moves most. Tap to cycle the axis; tap ± to invert.</Text>
        {AXES.map((a) => {
          const m = t[a.key];
          const nextAxis: Axis = m.axis === 'x' ? 'y' : m.axis === 'y' ? 'z' : 'x';
          return (
            <View key={a.key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={[s.text, { flex: 1 }]}>{a.label}</Text>
              <Pressable onPress={() => setAxis(a.key, { ...m, axis: nextAxis })}>
                <Text style={{ color: C.blue, fontWeight: '700', width: 40 }}>{m.axis.toUpperCase()}</Text>
              </Pressable>
              <Pressable onPress={() => setAxis(a.key, { ...m, invert: !m.invert })}>
                <Text style={{ color: m.invert ? C.amber : C.dim, fontWeight: '700' }}>{m.invert ? '−' : '+'}</Text>
              </Pressable>
            </View>
          );
        })}
      </Card>
      <Btn label="Reset to defaults" onPress={() => setThresholds(DEFAULT_THRESHOLDS)} />
      <Card title="ABOUT iOS LIMITS">
        <Text style={s.dim}>
          iOS does not let apps inject touches into other apps; there, Triki controls video inside this app's Web tab. Android allows it
          through the Accessibility service above.
        </Text>
      </Card>
    </ScrollView>
  );
}
