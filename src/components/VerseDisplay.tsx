import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import type { Verse, TranslationKey, PreferredLanguage } from '../types';
import { TRANSLATION_LABELS, TRANSLATION_KEYS, resolveSpeaker } from '../types';
import { DropdownPicker } from './DropdownPicker';

interface Props {
  verse: Verse;
  preferredTranslation: TranslationKey;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onNotePress: () => void;
  hasNote?: boolean;
  showCommentary?: boolean;
  language?: PreferredLanguage;
  textSize?: number;   // multiplier applied to all body fonts, default 1.0
}

export function VerseDisplay({
  verse,
  preferredTranslation,
  isFavorite,
  onToggleFavorite,
  onNotePress,
  hasNote = false,
  showCommentary = false,
  language = 'english',
  textSize = 1.0,
}: Props) {
  const c = useTheme();
  const [selectedTranslation, setSelectedTranslation] = useState<TranslationKey>(preferredTranslation);
  const [commExpanded, setCommExpanded] = useState(false);
  const [showSanskrit, setShowSanskrit] = useState(language === 'sanskrit');
  const fs = (n: number) => Math.round(n * textSize);

  // Sync when settings load asynchronously
  useEffect(() => {
    setSelectedTranslation(preferredTranslation);
  }, [preferredTranslation]);

  useEffect(() => {
    setShowSanskrit(language === 'sanskrit');
  }, [language]);

  // chinmay has no text — treat commentary as its translation body
  const availableKeys = TRANSLATION_KEYS.filter(k => {
    const t = verse.translations[k];
    return t && (t.text || t.commentary);
  });
  const currentTranslation = verse.translations[selectedTranslation] ?? verse.translations[availableKeys[0]];
  // chinmay has no translation text — show commentary as body instead
  const isChinmayOnly = selectedTranslation === 'chinmay' && !currentTranslation?.text;
  // Split each hemistich (half-verse) into 2 padas at the midpoint word boundary.
  // The data stores each hemistich as a \n-separated line ending with " .".
  // Lines with ≤2 words (e.g. speaker declarations like "dhṛtarāṣṭra uvāca") are kept whole.
  function splitHemistich(hemistich: string): string[] {
    const words = hemistich.trim().split(/\s+/);
    if (words.length <= 2) return [hemistich.trim()];
    const totalLen = hemistich.trim().length;
    const mid = totalLen / 2;
    let cumLen = 0;
    let bestSplit = Math.floor(words.length / 2);
    let bestDist = Infinity;
    for (let i = 0; i < words.length - 1; i++) {
      cumLen += words[i].length + 1;
      const dist = Math.abs(cumLen - mid);
      if (dist < bestDist) { bestDist = dist; bestSplit = i + 1; }
    }
    return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
  }

  const transliterationPadas = verse.transliteration
    .split('\n')
    .flatMap(line => splitHemistich(line.replace(/ \.$/, '').replace(/\./g, ' ').trim()))
    .filter(p => p.length > 0);

  // Sanskrit uses | (danda) as the hemistich terminator, same pada-split logic.
  const sanskritPadas = verse.sanskrit
    .split('\n')
    .flatMap(line => splitHemistich(line.replace(/ \|$/, '').trim()))
    .filter(p => p.length > 0);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: c.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Chapter / Verse badge */}
      <View style={[styles.badge, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
        <Text style={[styles.badgeText, { color: c.accent }]}>
          Chapter {verse.chapter} · Verse {verse.verse}
        </Text>
        {verse.speaker ? (
          <Text style={[styles.speaker, { color: c.textMuted }]}>{resolveSpeaker(verse.speaker, language)}</Text>
        ) : null}
      </View>

      {/* Script section — tappable toggle when language=english */}
      {language === 'english' ? (
        <TouchableOpacity
          onPress={() => setShowSanskrit(s => !s)}
          style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardBorder }]}
          activeOpacity={0.85}
        >
          <View style={styles.cardLabelRow}>
            <Text style={[styles.sectionLabel, { color: c.accent }]}>
              {showSanskrit ? 'Sanskrit' : 'Transliteration'}
            </Text>
            <Text style={[styles.toggleHint, { color: c.textMuted }]}>
              Tap · {showSanskrit ? 'see transliteration' : 'see Sanskrit'}
            </Text>
          </View>
          {showSanskrit ? (
            <View style={styles.padaBlock}>
              {sanskritPadas.map((pada, i) => (
                <Text key={i} style={[styles.sanskritLine, { color: c.sanskrit, fontSize: fs(20), lineHeight: fs(32) }]}>{pada}</Text>
              ))}
            </View>
          ) : (
            <View style={styles.padaBlock}>
              {transliterationPadas.map((pada, i) => (
                <Text key={i} style={[styles.transliterationLine, { color: c.transliteration, fontSize: fs(15), lineHeight: fs(26) }]}>{pada}</Text>
              ))}
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => setShowSanskrit(s => !s)}
          style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardBorder }]}
          activeOpacity={0.85}
        >
          <View style={styles.cardLabelRow}>
            <Text style={[styles.sectionLabel, { color: c.accent }]}>
              {showSanskrit ? 'Sanskrit' : 'Transliteration'}
            </Text>
            <Text style={[styles.toggleHint, { color: c.textMuted }]}>
              Tap · {showSanskrit ? 'see transliteration' : 'see Sanskrit'}
            </Text>
          </View>
          {showSanskrit ? (
            <View style={styles.padaBlock}>
              {sanskritPadas.map((pada, i) => (
                <Text key={i} style={[styles.sanskritLine, { color: c.sanskrit, fontSize: fs(20), lineHeight: fs(32) }]}>{pada}</Text>
              ))}
            </View>
          ) : (
            <View style={styles.padaBlock}>
              {transliterationPadas.map((pada, i) => (
                <Text key={i} style={[styles.transliterationLine, { color: c.transliteration, fontSize: fs(15), lineHeight: fs(26) }]}>{pada}</Text>
              ))}
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Translation text */}
      {currentTranslation ? (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardBorder }]}>
          <Text style={[styles.sectionLabel, { color: c.accent }]}>
            {TRANSLATION_LABELS[selectedTranslation] ?? ''}
          </Text>

          {/* chinmay has no text — show commentary as main body */}
          {isChinmayOnly ? (
            currentTranslation.commentary
              ? <Text style={[styles.translationText, { color: c.text, fontSize: fs(16), lineHeight: fs(26) }]}>{currentTranslation.commentary}</Text>
              : <Text style={[styles.unavailable, { color: c.textMuted }]}>No commentary available</Text>
          ) : (
            currentTranslation.text
              ? <Text style={[styles.translationText, { color: c.text, fontSize: fs(16), lineHeight: fs(26) }]}>{currentTranslation.text}</Text>
              : <Text style={[styles.unavailable, { color: c.textMuted }]}>No translation available</Text>
          )}

          {showCommentary && !isChinmayOnly && currentTranslation.commentary ? (
            <>
              <TouchableOpacity
                onPress={() => setCommExpanded(e => !e)}
                style={styles.commToggle}
              >
                <Text style={[styles.commToggleText, { color: c.primary }]}>
                  {commExpanded ? 'Hide Commentary' : 'Show Commentary'}
                </Text>
                <Ionicons
                  name={commExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={c.primary}
                />
              </TouchableOpacity>
              {commExpanded ? (
                <Text style={[styles.commentary, { color: c.textSecondary }]}>
                  {currentTranslation.commentary}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      {/* Translation dropdown */}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardBorder }]}>
        <DropdownPicker
          label="Translation"
          value={selectedTranslation}
          options={availableKeys.map(k => ({ value: k, label: TRANSLATION_LABELS[k] }))}
          onChange={setSelectedTranslation}
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onToggleFavorite}
          style={[styles.actionBtn, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorite ? c.heartActive : c.heartInactive}
          />
          <Text style={[styles.actionLabel, { color: isFavorite ? c.heartActive : c.textMuted }]}>
            {isFavorite ? 'Saved' : 'Favorite'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onNotePress}
          style={[styles.actionBtn, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <Ionicons name="create-outline" size={22} color={c.accent} />
          <Text style={[styles.actionLabel, { color: c.textMuted }]}>{hasNote ? 'Edit Note' : 'Add Note'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  badgeText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  speaker: { fontSize: 11, marginTop: 2 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  toggleHint: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  sanskritLine: {
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '400',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  sanskrit: {
    fontSize: 22,
    lineHeight: 36,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  padaBlock: {
    alignItems: 'center',
    paddingTop: 4,
  },
  transliterationLine: {
    fontSize: 15,
    lineHeight: 26,
    fontStyle: 'italic',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 4,
  },
  verseMarker: {
    marginTop: 10,
    letterSpacing: 1,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  translationText: {
    fontSize: 16,
    lineHeight: 26,
  },
  commToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  commToggleText: { fontSize: 13, fontWeight: '600' },
  commentary: { fontSize: 13, lineHeight: 21, marginTop: 8, fontStyle: 'italic' },
  unavailable: { fontSize: 14, fontStyle: 'italic', marginTop: 4 },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  actionLabel: { fontSize: 14, fontWeight: '600' },
});
