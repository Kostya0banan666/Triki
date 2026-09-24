import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

export const C = {
  bg: '#0B0D12',
  card: '#151922',
  cardHi: '#1C2230',
  border: '#232A38',
  text: '#F2F4F8',
  dim: '#8A93A6',
  accent: '#3DDC84',
  blue: '#4C8DFF',
  red: '#FF5A5F',
  amber: '#FFB547',
};

export function Card({ title, children, style }: { title?: string; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[s.card, style]}>
      {title ? <Text style={s.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Btn({
  label,
  onPress,
  kind = 'default',
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
}) {
  const bg = kind === 'primary' ? C.accent : kind === 'danger' ? '#3A1C22' : C.cardHi;
  const fg = kind === 'primary' ? '#06140B' : kind === 'danger' ? C.red : C.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.35 : pressed ? 0.7 : 1 }]}
    >
      <Text style={[s.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', gap: 10 }, style]}>{children}</View>;
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingTop: 64, paddingBottom: 120, gap: 14 },
  h1: { color: C.text, fontSize: 30, fontWeight: '800', letterSpacing: 0.5 },
  card: { backgroundColor: C.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, gap: 10 },
  cardTitle: { color: C.dim, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
  text: { color: C.text, fontSize: 15 },
  dim: { color: C.dim, fontSize: 13 },
  mono: { color: C.text, fontSize: 20, fontVariant: ['tabular-nums'], fontWeight: '600' },
});
