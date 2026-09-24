import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from './src/hooks/AppContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { DebugScreen } from './src/screens/DebugScreen';
import { ProfilesScreen } from './src/screens/ProfilesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { WebControllerScreen } from './src/webController/WebControllerScreen';
import { C } from './src/components/ui';

const TABS = [
  { id: 'home', label: 'Controller', icon: '◎', Screen: HomeScreen },
  { id: 'web', label: 'Web', icon: '▶', Screen: WebControllerScreen },
  { id: 'profiles', label: 'Profiles', icon: '☰', Screen: ProfilesScreen },
  { id: 'debug', label: 'Debug', icon: '⌁', Screen: DebugScreen },
  { id: 'settings', label: 'Settings', icon: '⚙', Screen: SettingsScreen },
] as const;

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('home');
  return (
    <AppProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Web tab stays mounted so the page is not reloaded when switching tabs */}
        {TABS.map(({ id, Screen }) =>
          id === tab || id === 'web' ? (
            <View key={id} style={{ flex: 1, display: id === tab ? 'flex' : 'none' }}>
              <Screen />
            </View>
          ) : null,
        )}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: 'row',
            backgroundColor: '#10131A',
            borderTopWidth: 1,
            borderColor: C.border,
            paddingBottom: 26,
            paddingTop: 8,
          }}
        >
          {TABS.map((t) => (
            <Pressable key={t.id} onPress={() => setTab(t.id)} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, color: tab === t.id ? C.accent : C.dim }}>{t.icon}</Text>
              <Text style={{ fontSize: 11, color: tab === t.id ? C.accent : C.dim, fontWeight: '600' }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </AppProvider>
  );
}
