import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDailyVerse } from '@/src/hooks/useDailyVerse';
import { useSettings } from '@/src/hooks/useSettings';
import { isFavorite, addFavorite, removeFavorite, getNote, upsertNote } from '@/src/db/queries';
import { VerseDisplay } from '@/src/components/VerseDisplay';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/theme';

export default function DailyScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { verse, resolved } = useDailyVerse();
  const { settings } = useSettings();

  const [favorite, setFavorite] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (!verse) return;
    isFavorite(verse.chapter, verse.verse).then(setFavorite);
    getNote(verse.chapter, verse.verse).then(n => setNoteText(n?.body ?? ''));
  }, [verse?.chapter, verse?.verse]);

  const toggleFavorite = useCallback(async () => {
    if (!verse) return;
    if (favorite) {
      await removeFavorite(verse.chapter, verse.verse);
      setFavorite(false);
    } else {
      await addFavorite(verse.chapter, verse.verse);
      setFavorite(true);
    }
  }, [verse, favorite]);

  const saveNote = useCallback(async () => {
    if (!verse) return;
    await upsertNote(verse.chapter, verse.verse, noteText);
    setNoteModalOpen(false);
  }, [verse, noteText]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (!resolved) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} size="large" />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading today's shlok…</Text>
      </View>
    );
  }

  if (!verse) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.background }]}>
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Could not load verse.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScreenHeader
        title="Pocket Gita"
        subtitle={today}
        right={
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <TouchableOpacity onPress={() => router.push('/history')} hitSlop={12}>
              <Ionicons name="time-outline" size={22} color={c.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={12}>
              <Ionicons name="settings-outline" size={22} color={c.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      <VerseDisplay
        verse={verse}
        preferredTranslation={settings.preferred_translation}
        language={settings.preferred_language}
        textSize={settings.text_size}
        isFavorite={favorite}
        onToggleFavorite={toggleFavorite}
        onNotePress={() => setNoteModalOpen(true)}
        hasNote={noteText.length > 0}
        showCommentary
      />

      {/* Note Modal */}
      <Modal visible={noteModalOpen} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={[styles.noteModal, { backgroundColor: c.surface }]}>
            <View style={styles.noteHeader}>
              <Text style={[styles.noteTitle, { color: c.text }]}>
                My Note — BG {verse.chapter}.{verse.verse}
              </Text>
              <TouchableOpacity onPress={() => setNoteModalOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.noteInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
              multiline
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Write your reflection here…"
              placeholderTextColor={c.textMuted}
              autoFocus
            />
            <TouchableOpacity
              onPress={saveNote}
              style={[styles.saveBtn, { backgroundColor: c.primary }]}
            >
              <Text style={styles.saveBtnText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  noteModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noteTitle: { fontSize: 16, fontWeight: '700' },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  saveBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
