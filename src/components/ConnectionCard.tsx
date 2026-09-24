import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { triki } from '../bluetooth/TrikiBLE';
import { useApp } from '../hooks/AppContext';
import type { FoundDevice } from '../types/triki';
import { Btn, C, Card, Row, s } from './ui';

const STATE_LABEL: Record<string, [string, string]> = {
  idle: ['Not connected', C.dim],
  'bluetooth-off': ['Bluetooth off', C.red],
  unauthorized: ['No Bluetooth permission', C.red],
  scanning: ['Scanning…', C.blue],
  connecting: ['Connecting…', C.amber],
  connected: ['Connected', C.accent],
  streaming: ['Connected · streaming', C.accent],
  reconnecting: ['Reconnecting…', C.amber],
  error: ['Error', C.red],
};

export function ConnectionCard() {
  const { status } = useApp();
  const [found, setFound] = useState<FoundDevice[]>([]);
  const [selected, setSelected] = useState<FoundDevice | null>(null);
  useEffect(() => triki.onDevicesFound(setFound), []);
  useEffect(() => {
    if (!selected && found.length) setSelected(found[0]);
  }, [found, selected]);

  const [label, color] = STATE_LABEL[status.state] ?? ['?', C.dim];
  const isConnected = status.state === 'connected' || status.state === 'streaming';
  const busy = status.state === 'connecting' || status.state === 'reconnecting';
  const target = isConnected || busy ? status.device : selected;

  return (
    <Card title="CONNECTION">
      <Btn label={status.state === 'scanning' ? 'Scanning…' : 'Scan for Triki'} kind="primary" onPress={() => triki.scan()} disabled={isConnected || busy} />

      {!isConnected && !busy && found.length > 1
        ? found.map((d) => (
            <Pressable key={d.id} onPress={() => setSelected(d)}>
              <Text style={[s.text, { color: selected?.id === d.id ? C.accent : C.text }]}>
                {selected?.id === d.id ? '◉ ' : '○ '}
                {d.name}  <Text style={s.dim}>{d.rssi ?? '?'} dBm</Text>
              </Text>
            </Pressable>
          ))
        : null}

      {target ? (
        <View style={{ gap: 2 }}>
          <Text style={[s.text, { fontSize: 19, fontWeight: '700' }]}>{target.name}</Text>
          <Text style={{ color, fontWeight: '700' }}>● {label}</Text>
        </View>
      ) : (
        <Text style={{ color, fontWeight: '700' }}>● {label}</Text>
      )}
      {status.error ? <Text style={{ color: C.amber }}>{status.error}</Text> : null}
      {status.stalled ? <Text style={{ color: C.amber }}>No data — Triki may be asleep. Press its button.</Text> : null}

      <Row>
        <Text style={s.dim}>Battery: {status.battery != null ? `${status.battery}%` : 'n/a'}</Text>
        <Text style={s.dim}>Signal: {status.rssi != null ? `${status.rssi} dBm` : 'n/a'}</Text>
      </Row>

      <Row>
        <Btn label="Connect" onPress={() => selected && triki.connect(selected).catch(() => {})} disabled={!selected || isConnected || busy} />
        <Btn label="Disconnect" kind="danger" onPress={() => triki.disconnect()} disabled={!isConnected && !busy} />
      </Row>
      <Row>
        <Btn label="Start Sensor" onPress={() => triki.startSensor().catch(() => {})} disabled={status.state !== 'connected'} />
        <Btn label="Stop Sensor" onPress={() => triki.stopSensor()} disabled={status.state !== 'streaming'} />
      </Row>
    </Card>
  );
}
