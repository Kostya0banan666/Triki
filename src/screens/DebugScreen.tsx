import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useApp } from '../hooks/AppContext';
import { GESTURE_LABEL, type GestureEvent } from '../gestures/types';
import { LivePanel } from '../components/LivePanel';
import { Btn, C, Card, Row, s } from '../components/ui';
import { clearLog, subscribeLog, type LogEntry } from '../utils/log';

export function DebugScreen() {
  const { engine } = useApp();
  const [history, setHistory] = useState<GestureEvent[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => engine.on((e) => setHistory((h) => [e, ...h].slice(0, 12))), [engine]);
  useEffect(() => subscribeLog((l) => setLogs(l.slice(-60).reverse())), []);

  const last = history[0];
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.h1}>Debug</Text>
      <Card title="DETECTED">
        <Text style={{ color: C.accent, fontSize: 28, fontWeight: '900' }}>{last ? GESTURE_LABEL[last.type].toUpperCase() : 'waiting…'}</Text>
        {last ? (
          <View style={{ gap: 2 }}>
            <Text style={s.text}>Confidence: {last.confidence.toFixed(2)}</Text>
            <Text style={s.text}>Raw peak acceleration: {last.peakAccel.toFixed(2)} g</Text>
            <Text style={s.text}>Peak angular rate: {last.peakGyro.toFixed(0)} °/s</Text>
            {last.detail ? <Text style={s.text}>Detail: {last.detail}</Text> : null}
          </View>
        ) : null}
        <Row>
          <Btn label="Set tilt rest pose" onPress={() => engine.calibrateRest()} />
          <Btn label="Clear" onPress={() => setHistory([])} />
        </Row>
      </Card>
      <Card title="HISTORY">
        {history.slice(1).map((e, i) => (
          <Text key={i} style={s.dim}>
            {new Date(e.t).toLocaleTimeString()}  {GESTURE_LABEL[e.type]}  ({e.confidence.toFixed(2)})
          </Text>
        ))}
      </Card>
      <LivePanel />
      <Card title="BLE LOG">
        <Btn label="Clear log" onPress={clearLog} />
        {logs.map((l, i) => (
          <Text key={i} style={{ color: l.level === 'error' ? C.red : l.level === 'warn' ? C.amber : C.dim, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
            {new Date(l.t).toLocaleTimeString()} {l.msg}
          </Text>
        ))}
      </Card>
    </ScrollView>
  );
}
