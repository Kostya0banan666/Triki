import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Switch, View } from 'react-native';
import { triki } from '../bluetooth/TrikiBLE';
import type { StreamRate } from '../bluetooth/constants';
import { useApp } from '../hooks/AppContext';
import { GESTURE_INFO, type GestureEvent, type GestureThresholds } from '../gestures/types';
import { openAccessibilitySettings, openAppSettings, runSystemAction, systemControlSupported } from '../system/SystemControl';
import { useLiveSnapshot } from '../components/LiveMeters';
import { Card, GlowButton, Row, Screen, T, Txt } from '../components/ui';
import { clearLog, log, subscribeLog, type LogEntry } from '../utils/log';

type NumKey = { [K in keyof GestureThresholds]: GestureThresholds[K] extends number ? K : never }[keyof GestureThresholds];

const TUNING: { key: NumKey; label: string; hint: string; step: number; min: number; max: number; unit?: string }[] = [
  { key: 'turnThreshold', label: 'Twist strength', hint: 'lower = lighter twists count', step: 60, min: 400, max: 1600 },
  { key: 'turnSensitivity', label: 'Twist forgiveness', hint: 'higher = sloppier twists count', step: 5, min: 0, max: 100 },
  { key: 'tapImpact', label: 'Tap force', hint: 'lower = softer knocks count', step: 20, min: 200, max: 900 },
  { key: 'tiltAmount', label: 'Tilt amount', hint: 'how far to lean for Tilt & hold', step: 25, min: 100, max: 900 },
  { key: 'doubleTapMs', label: 'Double-tap window', hint: '', step: 50, min: 300, max: 1000, unit: 'ms' },
  { key: 'repeatMs', label: 'Hold repeat speed', hint: 'volume knob speed', step: 20, min: 120, max: 800, unit: 'ms' },
  { key: 'clickMaxMs', label: 'Button click max', hint: '', step: 25, min: 150, max: 600, unit: 'ms' },
  { key: 'doubleClickGapMs', label: 'Button double-click gap', hint: '', step: 25, min: 150, max: 700, unit: 'ms' },
  { key: 'holdMs', label: 'Button hold time', hint: '', step: 50, min: 300, max: 1500, unit: 'ms' },
];

function Stepper({ label, hint, value, unit, step, min, max, onChange }: {
  label: string;
  hint: string;
  value: number;
  unit?: string;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const btn = (txt: string, v: number) => (
    <Pressable onPress={() => onChange(Math.max(min, Math.min(max, v)))} hitSlop={8} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.chip, alignItems: 'center', justifyContent: 'center' }}>
      <Txt weight="bold" style={{ color: T.cyan, fontSize: 20 }}>
        {txt}
      </Txt>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Txt weight="semibold">{label}</Txt>
        {hint ? <Txt style={{ color: T.dim, fontSize: 12 }}>{hint}</Txt> : null}
      </View>
      {btn('−', value - step)}
      <Txt weight="bold" style={{ width: 70, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {Math.round(value)}
        {unit ? <Txt style={{ color: T.dim, fontSize: 12 }}> {unit}</Txt> : null}
      </Txt>
      {btn('+', value + step)}
    </View>
  );
}

export function AdvancedScreen() {
  const { engine, profile, thresholds, setThresholds, resetThresholds, status, streamRate, setStreamRate, serviceOn } = useApp();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [last, setLast] = useState<GestureEvent | null>(null);
  const { frame, state, hz } = useLiveSnapshot(6);

  useEffect(() => subscribeLog((l) => setLogs(l.slice(-80).reverse())), []);
  useEffect(() => engine.on((e) => !e.repeat && e.type !== 'BUTTON_PRESS' && e.type !== 'BUTTON_RELEASE' && setLast(e)), [engine]);

  const android = Platform.OS === 'android';

  return (
    <Screen>
      <Txt weight="bold" style={{ fontSize: 30, color: T.cyan }}>
        Advanced
      </Txt>

      <Card title={`Tuning · ${profile.name}`}>
        {TUNING.map(({ key, ...t }) => (
          <Stepper key={key} {...t} value={thresholds[key]} onChange={(v) => setThresholds({ [key]: v } as Partial<GestureThresholds>)} />
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
          <View style={{ flex: 1 }}>
            <Txt weight="semibold">Swap twist direction</Txt>
            <Txt style={{ color: T.dim, fontSize: 12 }}>if right/left come out backwards</Txt>
          </View>
          <Switch value={thresholds.invertTurn} onValueChange={(v) => setThresholds({ invertTurn: v })} trackColor={{ true: T.green2 }} />
        </View>
        <GlowButton label="Reset tuning" kind="dark" icon="restore" onPress={resetThresholds} />
      </Card>

      <Card title="Stream">
        <Txt style={{ color: T.dim, fontSize: 13, marginBottom: 10 }}>The motion engine is tuned for ~53 Hz. Reconnect after changing.</Txt>
        <Row>
          {([53, 106, 208] as StreamRate[]).map((r) => (
            <GlowButton key={r} label={`${r} Hz`} kind={r === streamRate ? 'green' : 'dark'} onPress={() => setStreamRate(r)} style={{ flex: 1 }} />
          ))}
        </Row>
        <Row style={{ marginTop: 10 }}>
          <GlowButton label="Start sensor" kind="dark" disabled={status.state !== 'connected'} onPress={() => triki.startSensor().catch(() => {})} style={{ flex: 1 }} />
          <GlowButton label="Stop sensor" kind="dark" disabled={status.state !== 'streaming'} onPress={() => triki.stopSensor()} style={{ flex: 1 }} />
        </Row>
      </Card>

      {android ? (
        <Card title="Android control">
          <Txt style={{ color: serviceOn ? T.green : T.amber }}>
            ● Accessibility service {systemControlSupported ? (serviceOn ? 'enabled' : 'disabled') : 'missing from this build'}
          </Txt>
          <View style={{ gap: 10, marginTop: 10 }}>
            <GlowButton label="Accessibility settings" kind="dark" icon="human" onPress={openAccessibilitySettings} />
            <GlowButton label="App info (restricted settings)" kind="dark" icon="information-outline" onPress={openAppSettings} />
            <GlowButton
              label="Test: next video in 5 s"
              kind="cyan"
              icon="timer-outline"
              onPress={() => {
                log('Test swipe in 5 s: open TikTok now');
                setTimeout(() => log(`Test swipe ${runSystemAction('NEXT') ? 'sent' : 'FAILED (service off)'}`), 5000);
              }}
            />
            <Txt style={{ color: T.dim, fontSize: 12 }}>
              Tip: set the app’s battery usage to “Unrestricted” so Android never pauses it in the background.
            </Txt>
          </View>
        </Card>
      ) : null}

      <Card title="Diagnostics">
        <Txt weight="bold" style={{ color: T.green, fontSize: 22 }}>
          {last ? GESTURE_INFO[last.type].label.toUpperCase() : 'waiting…'}
        </Txt>
        {last ? (
          <View style={{ marginTop: 4 }}>
            <Txt>Confidence: {last.confidence.toFixed(2)}</Txt>
            <Txt>Raw peak acceleration: {last.peakAccel.toFixed(2)} g</Txt>
            <Txt>Peak rotation (raw/131): {last.peakGyro.toFixed(0)}</Txt>
          </View>
        ) : null}
        <View style={{ marginTop: 10 }}>
          <Txt style={{ color: T.dim, fontSize: 13 }}>
            Engine: {state.action} · twist {Math.round(state.twist)} · tilt {Math.round(state.tilt)} · spin {Math.round(state.spin)}
          </Txt>
          <Txt style={{ color: T.dim, fontSize: 13 }}>
            {frame
              ? `Gyro °/s ${frame.gyro.x.toFixed(1)}, ${frame.gyro.y.toFixed(1)}, ${frame.gyro.z.toFixed(1)} · Accel g ${frame.accel.x.toFixed(2)}, ${frame.accel.y.toFixed(2)}, ${frame.accel.z.toFixed(2)}`
              : 'No frames yet'}
          </Txt>
          <Txt style={{ color: T.dim, fontSize: 13 }}>
            {hz} frames/s · button {frame?.button ? 'pressed' : 'released'}
          </Txt>
        </View>
      </Card>

      <Card title="Bluetooth log">
        <GlowButton label="Clear log" kind="dark" onPress={clearLog} />
        <View style={{ marginTop: 10, gap: 2 }}>
          {logs.map((l, i) => (
            <Txt
              key={i}
              style={{
                color: l.level === 'error' ? T.red : l.level === 'warn' ? T.amber : T.dim,
                fontSize: 12,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              }}
            >
              {new Date(l.t).toLocaleTimeString()} {l.msg}
            </Txt>
          ))}
        </View>
      </Card>

      <Card title="About">
        <Txt style={{ color: T.dim, fontSize: 13, lineHeight: 19 }}>
          Android: moves control other apps through an Accessibility service (swipes/taps) and media keys. iPhone: Apple does not allow any
          app to touch other apps, so moves control the built-in web player only.{'\n\n'}Motion engine adapted from TRIKI Control by
          Wojciech “Koksny” Górny (MIT License). Not affiliated with Żabka or Caps Apps.
        </Txt>
      </Card>
    </Screen>
  );
}
