import React from 'react';
import { ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../hooks/AppContext';
import { T, Txt } from './ui';

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const { status } = useApp();
  const battery = status.battery;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <LinearGradient
        colors={[T.magenta, T.purple, '#3F7BFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
      >
        <Txt weight="bold" style={{ fontSize: 32, color: '#FFFFFF', marginTop: -2 }}>
          T
        </Txt>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Txt weight="bold" style={{ fontSize: 30, color: T.cyan, lineHeight: 32 }}>
          TRIKI <Txt weight="bold" style={{ fontSize: 30, color: T.cyan }}>Control</Txt>
        </Txt>
        {subtitle ? <Txt style={{ color: T.dim, fontSize: 13 }}>{subtitle}</Txt> : null}
      </View>
      {battery != null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialCommunityIcons
            name={battery > 60 ? 'battery-high' : battery > 25 ? 'battery-medium' : 'battery-low'}
            size={22}
            color={battery > 25 ? T.green : T.red}
          />
          <Txt style={{ color: T.dim, fontSize: 13 }}>{battery}%</Txt>
        </View>
      ) : null}
    </View>
  );
}

export interface StepState {
  label: string;
  done: boolean;
}

/** "1 Connect · 2 Choose app · 3 Turn on · 4 Play!" progress pills. */
export function StepPills({ steps }: { steps: StepState[] }) {
  const current = steps.findIndex((s) => !s.done);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
      {steps.map((s, i) => {
        const active = i === current || (current === -1 && i === steps.length - 1);
        const color = active ? T.cyan : s.done ? T.green : T.faint;
        return (
          <View
            key={s.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingLeft: 6,
              paddingRight: 14,
              paddingVertical: 6,
              borderRadius: 22,
              borderWidth: 1.5,
              borderColor: color + (active ? 'FF' : '88'),
              backgroundColor: active ? 'rgba(77,227,240,0.10)' : 'rgba(98,242,150,0.05)',
            }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: active ? T.cyan : s.done ? T.green : T.chip,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {s.done && !active ? (
                <MaterialCommunityIcons name="check-bold" size={15} color={T.ink} />
              ) : (
                <Txt weight="bold" style={{ color: active || s.done ? T.ink : T.dim, fontSize: 14 }}>
                  {i + 1}
                </Txt>
              )}
            </View>
            <Txt weight="bold" style={{ color: active ? T.cyan : s.done ? T.green : T.dim, fontSize: 15 }}>
              {s.label}
            </Txt>
          </View>
        );
      })}
    </ScrollView>
  );
}
