import React from 'react';
import { ScrollView, Text } from 'react-native';
import { ConnectionCard } from '../components/ConnectionCard';
import { LivePanel } from '../components/LivePanel';
import { useApp } from '../hooks/AppContext';
import { GESTURE_LABEL } from '../gestures/types';
import { C, Card, s } from '../components/ui';

export function HomeScreen() {
  const { lastGesture } = useApp();
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.h1}>TRIKI Controller</Text>
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
