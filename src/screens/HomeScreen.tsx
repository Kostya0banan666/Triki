import React, { useEffect, useState } from 'react';
import { AppState, ScrollView, Text } from 'react-native';
import { isSystemServiceEnabled, openAccessibilitySettings, systemControlSupported } from '../system/SystemControl';
import { ConnectionCard } from '../components/ConnectionCard';
import { LivePanel } from '../components/LivePanel';
import { useApp } from '../hooks/AppContext';
import { GESTURE_LABEL } from '../gestures/types';
import { Btn, C, Card, s } from '../components/ui';

export function HomeScreen() {
  const { lastGesture, systemControl, setSystemControl } = useApp();
  const [serviceOn, setServiceOn] = useState(isSystemServiceEnabled());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setServiceOn(isSystemServiceEnabled()));
    return () => sub.remove();
  }, []);
  const ready = serviceOn && systemControl;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.h1}>TRIKI Controller</Text>
      {systemControlSupported ? (
        <Card title="CONTROL TIKTOK / OTHER APPS" style={{ borderColor: ready ? C.accent : C.amber }}>
          <Text style={{ color: ready ? C.accent : C.amber, fontWeight: '800', fontSize: 16 }}>
            {ready ? '● Ready: open TikTok and use Triki' : '● Not set up: Triki only works inside this app'}
          </Text>
          {!serviceOn ? (
            <>
              <Text style={s.dim}>Tap below, find "Triki Controller" under Installed apps/Downloaded apps, and turn it ON.</Text>
              <Btn label="1. Enable Triki in Accessibility" kind="primary" onPress={openAccessibilitySettings} />
            </>
          ) : null}
          {serviceOn && !systemControl ? <Btn label="2. Turn on system control" kind="primary" onPress={() => setSystemControl(true)} /> : null}
        </Card>
      ) : (
        <Card title="CONTROL OTHER APPS">
          <Text style={{ color: C.amber }}>
            {'Not available in this build (Android native module missing). Rebuild the Android app with EAS; the Expo Go / web version cannot control other apps.'}
          </Text>
        </Card>
      )}
      <ConnectionCard />
      <LivePanel />
      <Card title="LAST GESTURE">
        <Text style={{ color: C.accent, fontSize: 22, fontWeight: '800' }}>
          {lastGesture ? GESTURE_LABEL[lastGesture.type].toUpperCase() : '—'}
        </Text>
      </Card>
    </ScrollView>
  );
}
