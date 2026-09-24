import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { F, T, type IconName } from './theme';

export { T, F };

/** Text in the app font. */
export function Txt({ style, weight = 'medium', ...rest }: TextProps & { weight?: keyof typeof F }) {
  return <Text {...rest} style={[{ color: T.text, fontFamily: F[weight], fontSize: 15 }, style]} />;
}

/** Full-screen gradient background with soft neon glows and a scrolling body. */
export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: T.bgMid }}>
      <LinearGradient colors={[T.bgTop, T.bgMid, T.bgBottom]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[s.glow, { top: -120, left: -100, backgroundColor: 'rgba(255, 61, 203, 0.10)' }]} />
      <View pointerEvents="none" style={[s.glow, { bottom: -140, right: -120, backgroundColor: 'rgba(77, 227, 240, 0.08)' }]} />
      {scroll ? (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </View>
  );
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return (
    <Txt weight="bold" style={[{ color: T.dim, fontSize: 13, letterSpacing: 2.4, textTransform: 'uppercase' }, style]}>
      {children}
    </Txt>
  );
}

export function Badge({ label, color = T.green }: { label: string; color?: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: color + '66', backgroundColor: color + '14', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Txt weight="bold" style={{ color, fontSize: 11, letterSpacing: 1.6 }}>
        {label.toUpperCase()}
      </Txt>
    </View>
  );
}

/** Glass card with an optional spaced-caps title and right-side badge. */
export function Card({
  title,
  badge,
  children,
  style,
}: {
  title?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[s.card, style]}>
      {title || badge ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          {title ? <SectionLabel>{title}</SectionLabel> : <View />}
          {badge}
        </View>
      ) : null}
      {children}
    </View>
  );
}

type BtnKind = 'green' | 'dark' | 'danger' | 'cyan';

/** Big rounded neon button. `active` adds the white inner ring from the TRIKI Control look. */
export function GlowButton({
  label,
  onPress,
  onPressIn,
  onPressOut,
  kind = 'green',
  icon,
  big,
  active,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  kind?: BtnKind;
  icon?: IconName;
  big?: boolean;
  active?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const fg = kind === 'green' ? T.ink : kind === 'danger' ? T.pink : kind === 'cyan' ? T.cyan : T.text;
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      {icon ? <MaterialCommunityIcons name={icon} size={big ? 26 : 19} color={fg} /> : null}
      <Txt weight="bold" style={{ color: fg, fontSize: big ? 24 : 16 }}>
        {label}
      </Txt>
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={({ pressed }) => [
        { borderRadius: big ? 22 : 16, opacity: disabled ? 0.4 : pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
        kind === 'green' ? s.greenShadow : null,
        style,
      ]}
    >
      {kind === 'green' ? (
        <LinearGradient
          colors={[T.green, T.green2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.btn, big && s.btnBig, active && s.activeRing]}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            s.btn,
            big && s.btnBig,
            {
              backgroundColor: kind === 'danger' ? 'rgba(255,92,154,0.08)' : kind === 'cyan' ? 'rgba(77,227,240,0.06)' : T.chip,
              borderWidth: 1.5,
              borderColor: kind === 'danger' ? T.pink + '99' : kind === 'cyan' ? T.cyan + '99' : T.cardBorder,
            },
          ]}
        >
          {inner}
        </View>
      )}
    </Pressable>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', gap: 12 }, style]}>{children}</View>;
}

export const s = StyleSheet.create({
  content: { padding: 16, paddingTop: 58, paddingBottom: 130, gap: 16 },
  glow: { position: 'absolute', width: 380, height: 380, borderRadius: 190 },
  card: {
    backgroundColor: T.card,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: T.cardBorder,
  },
  btn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnBig: { paddingVertical: 22, borderRadius: 22 },
  activeRing: { borderWidth: 3, borderColor: '#FFFFFF' },
  greenShadow: {
    shadowColor: T.green,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});
