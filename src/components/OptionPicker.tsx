import React from 'react';
import { Modal, Pressable, ScrollView, Text } from 'react-native';
import { C } from './ui';

/** Cross-platform bottom-sheet picker (ActionSheetIOS does not exist on Android). */
export function OptionPicker({
  visible,
  title,
  options,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <ScrollView style={{ maxHeight: '60%', backgroundColor: C.card, borderTopLeftRadius: 18, borderTopRightRadius: 18 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: C.dim, fontWeight: '700', marginBottom: 8 }}>{title}</Text>
        {options.map((o, i) => (
          <Pressable
            key={o}
            onPress={() => {
              onPick(i);
              onClose();
            }}
            style={({ pressed }) => ({ paddingVertical: 13, borderBottomWidth: 1, borderColor: C.border, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ color: C.text, fontSize: 16 }}>{o}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Modal>
  );
}
