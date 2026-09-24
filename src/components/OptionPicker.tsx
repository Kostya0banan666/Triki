import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { T, Txt } from './ui';

/** Cross-platform bottom-sheet picker (ActionSheetIOS does not exist on Android). */
export function OptionPicker({
  visible,
  title,
  options,
  selected,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected?: number;
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(5,3,15,0.6)' }} onPress={onClose} />
      <View style={{ maxHeight: '65%', backgroundColor: '#1A1440', borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: T.cardBorder }}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: T.faint, marginTop: 10 }} />
        <Txt weight="bold" style={{ color: T.dim, fontSize: 13, letterSpacing: 2, padding: 18, paddingBottom: 8 }}>
          {title.toUpperCase()}
        </Txt>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}>
          {options.map((o, i) => (
            <Pressable
              key={o}
              onPress={() => {
                onPick(i);
                onClose();
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 14,
                paddingHorizontal: 12,
                borderRadius: 14,
                backgroundColor: i === selected ? 'rgba(98,242,150,0.10)' : pressed ? T.chip : 'transparent',
              })}
            >
              <Txt weight="semibold" style={{ fontSize: 17, color: i === selected ? T.green : T.text }}>
                {o}
              </Txt>
              {i === selected ? <MaterialCommunityIcons name="check-circle" size={20} color={T.green} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
