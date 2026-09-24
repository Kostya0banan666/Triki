import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { AppProvider } from './src/hooks/AppContext';
import { AccessibilitySetup } from './src/components/AccessibilitySetup';
import { useSystemControl } from './src/hooks/useSystemControl';
import { ControlScreen, type TabId } from './src/screens/ControlScreen';
import { MovesScreen } from './src/screens/MovesScreen';
import { MappingScreen } from './src/screens/MappingScreen';
import { AdvancedScreen } from './src/screens/AdvancedScreen';
import { WebControllerScreen } from './src/webController/WebControllerScreen';
import { T, Txt } from './src/components/ui';
import type { IconName } from './src/components/theme';

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'control', label: 'Control', icon: 'gamepad-round' },
  { id: 'moves', label: 'Moves', icon: 'school-outline' },
  { id: 'mapping', label: 'Mapping', icon: 'swap-horizontal' },
  ...(Platform.OS === 'ios' ? [{ id: 'web' as TabId, label: 'Web', icon: 'web' as IconName }] : []),
  { id: 'advanced', label: 'Advanced', icon: 'cog-outline' },
];

function SystemControlBridge() {
  useSystemControl();
  return null;
}

export default function App() {
  const [tab, setTab] = useState<TabId>('control');
  const [fontsLoaded, fontError] = useFonts({ Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold });

  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: T.bgMid }} />;

  return (
    <AppProvider>
      <StatusBar style="light" />
      <SystemControlBridge />
      <AccessibilitySetup />
      <View style={{ flex: 1, backgroundColor: T.bgMid }}>
        {tab === 'control' ? <ControlScreen go={setTab} /> : null}
        {tab === 'moves' ? <MovesScreen /> : null}
        {tab === 'mapping' ? <MappingScreen /> : null}
        {tab === 'advanced' ? <AdvancedScreen /> : null}
        {/* the web player stays mounted so the page is not reloaded when switching tabs */}
        {Platform.OS === 'ios' ? (
          <View style={{ flex: 1, display: tab === 'web' ? 'flex' : 'none' }}>
            <WebControllerScreen />
          </View>
        ) : null}

        <View
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 18,
            flexDirection: 'row',
            backgroundColor: 'rgba(22, 17, 50, 0.96)',
            borderRadius: 26,
            borderWidth: 1,
            borderColor: T.cardBorder,
            paddingVertical: 8,
          }}
        >
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <Pressable key={t.id} onPress={() => setTab(t.id)} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <View style={{ paddingHorizontal: 14, paddingVertical: 3, borderRadius: 14, backgroundColor: on ? 'rgba(77,227,240,0.14)' : 'transparent' }}>
                  <MaterialCommunityIcons name={t.icon} size={22} color={on ? T.cyan : T.faint} />
                </View>
                <Txt weight="semibold" style={{ fontSize: 11, color: on ? T.cyan : T.faint }}>
                  {t.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>
    </AppProvider>
  );
}
