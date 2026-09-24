import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../hooks/AppContext';
import { GESTURE_INFO, MAPPABLE_GESTURES, type GestureType } from '../gestures/types';
import { ACTION_LABEL, ALL_ACTIONS, DEFAULT_PROFILES } from '../profiles/profiles';
import { WEB_TARGETS } from '../webController/targets';
import { OptionPicker } from '../components/OptionPicker';
import { Card, GlowButton, Screen, T, Txt } from '../components/ui';
import { GESTURE_ICON, type IconName } from '../components/theme';

export function MappingScreen() {
  const { profiles, setProfiles, profile: active, setActiveProfileId } = useApp();
  const [editing, setEditing] = useState(active.id);
  const [picking, setPicking] = useState<GestureType | 'target' | null>(null);
  const profile = profiles.find((p) => p.id === editing) ?? active;

  const update = (fn: (p: typeof profile) => typeof profile) => setProfiles(profiles.map((p) => (p.id === profile.id ? fn(p) : p)));

  const onPick = (i: number) => {
    if (picking === 'target') update((p) => ({ ...p, targetId: WEB_TARGETS[i].id }));
    else if (picking) {
      const g = picking;
      update((p) => ({ ...p, mappings: { ...p.mappings, [g]: ALL_ACTIONS[i] } }));
    }
  };

  return (
    <Screen>
      <Txt weight="bold" style={{ fontSize: 30, color: T.cyan }}>
        Mapping
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {profiles.map((p) => {
          const sel = p.id === profile.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setEditing(p.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 22,
                borderWidth: 1.5,
                borderColor: sel ? T.magenta : T.cardBorder,
                backgroundColor: sel ? 'rgba(255,61,203,0.12)' : T.chip,
              }}
            >
              <MaterialCommunityIcons name={p.icon as IconName} size={18} color={sel ? p.color : T.dim} />
              <Txt weight="bold" style={{ color: sel ? T.text : T.dim }}>
                {p.name}
                {p.id === active.id ? ' ✓' : ''}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card title={`${profile.name} moves`}>
        {MAPPABLE_GESTURES.map((g, i) => {
          const a = profile.mappings[g] ?? 'NONE';
          return (
            <Pressable
              key={g}
              onPress={() => setPicking(g)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                borderTopWidth: i ? 1 : 0,
                borderColor: T.insetBorder,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: T.chip, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name={GESTURE_ICON[g]} size={21} color={T.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt weight="bold" style={{ fontSize: 16 }}>
                  {GESTURE_INFO[g].label}
                </Txt>
                <Txt style={{ color: T.dim, fontSize: 12 }} numberOfLines={1}>
                  {GESTURE_INFO[g].how}
                </Txt>
              </View>
              <Txt weight="semibold" style={{ color: a === 'NONE' ? T.faint : T.green, maxWidth: 130, textAlign: 'right' }}>
                {ACTION_LABEL[a]} ›
              </Txt>
            </Pressable>
          );
        })}
      </Card>

      {Platform.OS === 'ios' ? (
        <Card title="Web player site">
          <Pressable onPress={() => setPicking('target')}>
            <Txt style={{ color: T.cyan }}>{WEB_TARGETS.find((t) => t.id === profile.targetId)?.name ?? '?'} ›</Txt>
          </Pressable>
        </Card>
      ) : null}

      <GlowButton
        label={profile.id === active.id ? 'This is the active app' : `Use ${profile.name}`}
        disabled={profile.id === active.id}
        onPress={() => setActiveProfileId(profile.id)}
      />
      <GlowButton
        label="Reset this mapping"
        kind="dark"
        icon="restore"
        onPress={() => {
          const def = DEFAULT_PROFILES.find((d) => d.id === profile.id);
          if (def) update((p) => ({ ...p, mappings: { ...def.mappings } }));
        }}
      />

      <OptionPicker
        visible={picking !== null}
        title={picking === 'target' ? 'Web player site' : picking ? GESTURE_INFO[picking].label : ''}
        options={picking === 'target' ? WEB_TARGETS.map((t) => t.name) : ALL_ACTIONS.map((a) => ACTION_LABEL[a])}
        selected={
          picking === 'target'
            ? WEB_TARGETS.findIndex((t) => t.id === profile.targetId)
            : picking
              ? ALL_ACTIONS.indexOf(profile.mappings[picking] ?? 'NONE')
              : undefined
        }
        onPick={onPick}
        onClose={() => setPicking(null)}
      />
    </Screen>
  );
}
