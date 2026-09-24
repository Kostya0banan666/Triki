import React from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../hooks/AppContext';
import { openAccessibilitySettings, openAppSettings } from '../system/SystemControl';
import { CapMascot } from './CapMascot';
import { GlowButton, T, Txt } from './ui';

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: T.cyan, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        <Txt weight="bold" style={{ color: T.ink }}>
          {n}
        </Txt>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

/**
 * Prominent disclosure + guided setup for the Android accessibility service.
 * Shown on launch while the service is off; closes itself once it is on.
 */
export function AccessibilitySetup() {
  const { setupVisible, hideSetup, refreshService, profile } = useApp();
  if (Platform.OS !== 'android') return null;

  return (
    <Modal visible={setupVisible} animationType="slide" onRequestClose={hideSetup} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: T.bgMid }}>
        <LinearGradient colors={[T.bgTop, T.bgMid, T.bgBottom]} style={StyleSheet.absoluteFill} />
        <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 64, paddingBottom: 48, gap: 18 }}>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <CapMascot size={120} mood="happy" />
            <Txt weight="bold" style={{ fontSize: 28, color: T.cyan, textAlign: 'center' }}>
              Let Triki control {profile.name}
            </Txt>
            <Txt style={{ color: T.dim, textAlign: 'center', lineHeight: 21 }}>
              To scroll, pause and like videos in other apps, Android needs you to switch on{' '}
              <Txt weight="bold">Triki Controller</Txt> in Accessibility. Only you can do this; no app can turn it on by itself.
            </Txt>
          </View>

          <View style={{ backgroundColor: T.card, borderRadius: 24, borderWidth: 1, borderColor: T.cardBorder, padding: 18, gap: 16 }}>
            <Step n={1}>
              <Txt weight="semibold">Tap the green button below.</Txt>
            </Step>
            <Step n={2}>
              <Txt weight="semibold">
                Find <Txt weight="bold" style={{ color: T.green }}>Triki Controller</Txt> (often under “Downloaded apps” or “Installed apps”), open it and switch it
                ON. Confirm with Allow.
              </Txt>
            </Step>
            <Step n={3}>
              <Txt weight="semibold">Come back here. This screen closes by itself when it worked.</Txt>
            </Step>
          </View>

          <GlowButton big label="Open Accessibility" icon="human" onPress={openAccessibilitySettings} />

          <View style={{ backgroundColor: 'rgba(255,194,77,0.08)', borderRadius: 20, borderWidth: 1, borderColor: T.amber + '55', padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <MaterialCommunityIcons name="alert-outline" size={20} color={T.amber} />
              <Txt weight="bold" style={{ color: T.amber }}>
                Switch greyed out or “Restricted setting”?
              </Txt>
            </View>
            <Txt style={{ color: T.dim, lineHeight: 20 }}>
              Android 13+ blocks this for apps installed from a browser. Open App info, tap ⋮ in the top-right corner, choose{' '}
              <Txt weight="bold">Allow restricted settings</Txt>, confirm, then do step 2 again.
            </Txt>
            <GlowButton label="Open App info" kind="dark" icon="information-outline" onPress={openAppSettings} />
          </View>

          <Txt style={{ color: T.faint, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
            Triki only performs swipes, taps and volume/media keys when you move the cap. It does not read your screen or collect any data.
          </Txt>

          <Pressable onPress={refreshService}>
            <Txt style={{ color: T.cyan, textAlign: 'center' }}>I switched it on, check again</Txt>
          </Pressable>
          <Pressable onPress={hideSetup}>
            <Txt style={{ color: T.dim, textAlign: 'center' }}>Later (Triki will only work inside this app)</Txt>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
