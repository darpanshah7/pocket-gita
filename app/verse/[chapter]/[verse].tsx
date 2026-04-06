import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, Modal, TextInput, Text,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGitaData } from '@/src/hooks/useGitaData';
import { useSettings } from '@/src/hooks/useSettings';
import { resolveSpeaker } from '@/src/types';
import { isFavorite, addFavorite, removeFavorite, getNote, upsertNote } from '@/src/db/queries';
import { VerseDisplay } from '@/src/components/VerseDisplay';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/theme';

export default function VerseScreen() {
  const c = useTheme();
  const { chapter: chParam, verse: vParam } = useLocalSearchParams<{
    chapter: string;
    verse: string;
  }>();
  const chapterNum = parseInt(chParam ?? '1', 10);
  const verseNum = parseInt(vParam ?? '1', 10);

  const { getVerse, loading } = useGitaData();
  const { settings } = useSettings();

  const [favorite, setFavorite] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');

  const verse = getVerse(chapterNum, verseNum);

  useEffect(() => {
    if (!verse) return;
    isFavorite(chapterNum, verseNum).then(setFavorite);
    getNote(chapterNum, verseNum).then(n => setNoteText(n?.body ?? ''));
  }, [chapterNum, verseNum]);

  const toggleFavorite = useCallback(async () => {
    if (favorite) {
      await removeFavorite(chapterNum, verseNum);
      setFavorite(false);
    } else {
      await addFavorite(chapterNum, verseNum);
      setFavorite(true);
    }
  }, [chapterNum, verseNum, favorite]);

  const saveNote = useCallback(async () => {
    await upsertNote(chapterNum, verseNum, noteText);
    setNoteOpen(false);
  }, [chapterNum, verseNum, noteText]);

  if (loading || !verse) {
    return (
      <View style={[styles.loading, { backgroundColor: c.background }]}>
        {loading ? <ActivityIndicator color={c.primary} /> : (
          <Text style={{ color: c.textMuted }}>Verse not found.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScreenHeader
        showBack
        title={`BG ${chapterNum}.${verseNum}`}
        subtitle={verse.speaker ? resolveSpeaker(verse.speaker, settings.preferred_language) : undefined}
      />

      <VerseDisplay
        verse={verse}
        preferredTranslation={settings.preferred_translation}
        language={settings.preferred_language}
        textSize={settings.text_size}
        isFavorite={favorite}
        onToggleFavorite={toggleFavorite}
        onNotePress={() => setNoteOpen(true)}
        hasNote={noteText.length > 0}
        showCommentary
      />


      <Modal visible={noteOpen} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.backdrop}
        >
          <View style={[styles.noteModal, { backgroundColor: c.surface }]}>
            <View style={styles.noteHeader}>
              <Text style={[styles.noteTitle, { color: c.text }]}>
                My Note — BG {chapterNum}.{verseNum}
              </Text>
              <TouchableOpacity onPress={() => setNoteOpen(false)} hitSlop={12}>
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
            <TouchableOpacity onPress={saveNote} style={[styles.saveBtn, { backgroundColor: c.primary }]}>
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
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
