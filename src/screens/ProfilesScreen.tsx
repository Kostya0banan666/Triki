import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../hooks/AppContext';
import { ALL_GESTURES, GESTURE_LABEL, type GestureType } from '../gestures/types';
import { ACTION_LABEL, ALL_ACTIONS, DEFAULT_PROFILES } from '../profiles/profiles';
import { WEB_TARGETS } from '../webController/targets';
import { Btn, C, Card, s } from '../components/ui';
import { OptionPicker } from '../components/OptionPicker';

export function ProfilesScreen() {
  const { profiles, setProfiles, activeProfileId, setActiveProfileId } = useApp();
  const [editing, setEditing] = useState(activeProfileId);
  const profile = profiles.find((p) => p.id === editing) ?? profiles[0];

  const [picking, setPicking] = useState<GestureType | 'target' | null>(null);

  const onPick = (i: number) => {
    if (picking === 'target') {
      setProfiles(profiles.map((p) => (p.id === profile.id ? { ...p, targetId: WEB_TARGETS[i].id } : p)));
    } else if (picking) {
      const g = picking;
      setProfiles(profiles.map((p) => (p.id === profile.id ? { ...p, mappings: { ...p.mappings, [g]: ALL_ACTIONS[i] } } : p)));
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.h1}>Profiles</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {profiles.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => setEditing(p.id)}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: p.id === profile.id ? C.accent : C.cardHi }}
          >
            <Text style={{ color: p.id === profile.id ? '#06140B' : C.text, fontWeight: '700' }}>
              {p.name}
              {p.id === activeProfileId ? ' ✓' : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Card title={`${profile.name.toUpperCase()} MAPPING`}>
        <Pressable onPress={() => setPicking('target')}>
          <Text style={s.text}>
            Web service: <Text style={{ color: C.blue }}>{WEB_TARGETS.find((t) => t.id === profile.targetId)?.name ?? '?'}</Text>
          </Text>
        </Pressable>
        {ALL_GESTURES.map((g) => (
          <Pressable key={g} onPress={() => setPicking(g)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderColor: C.border }}>
              <Text style={s.text}>{GESTURE_LABEL[g]}</Text>
              <Text style={{ color: profile.mappings[g] && profile.mappings[g] !== 'NONE' ? C.accent : C.dim }}>
                {ACTION_LABEL[profile.mappings[g] ?? 'NONE']}
              </Text>
            </View>
          </Pressable>
        ))}
        <Btn label={profile.id === activeProfileId ? 'Active profile' : 'Use this profile'} kind="primary" onPress={() => setActiveProfileId(profile.id)} disabled={profile.id === activeProfileId} />
        <Btn
          label="Reset this profile"
          onPress={() => {
            const def = DEFAULT_PROFILES.find((d) => d.id === profile.id);
            if (def) setProfiles(profiles.map((p) => (p.id === def.id ? { ...def, mappings: { ...def.mappings } } : p)));
          }}
        />
      </Card>
      <OptionPicker
        visible={picking !== null}
        title={picking === 'target' ? 'Web service' : picking ? GESTURE_LABEL[picking] : ''}
        options={picking === 'target' ? WEB_TARGETS.map((t) => t.name) : ALL_ACTIONS.map((a) => ACTION_LABEL[a])}
        onPick={onPick}
        onClose={() => setPicking(null)}
      />
    </ScrollView>
  );
}
