import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGitaData } from '@/src/hooks/useGitaData';
import { useSettings } from '@/src/hooks/useSettings';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/theme';
import type { Verse } from '@/src/types';

function highlight(text: string, query: string): string {
  return text;
}

interface Result {
  verse: Verse;
  snippet: string;
}

export default function SearchScreen() {
  const c = useTheme();
  const { data, loading } = useGitaData();
  const { settings } = useSettings();
  const [query, setQuery] = useState('');

  const results: Result[] = useMemo(() => {
    if (!data || query.trim().length < 2) return [];
    const q = query.toLowerCase();

    // Direct chapter.verse lookup (e.g. "4.4" or "15.7")
    const cvMatch = query.trim().match(/^(\d+)\.(\d+)$/);
    if (cvMatch) {
      const ch = parseInt(cvMatch[1], 10);
      const v = parseInt(cvMatch[2], 10);
      const verse = data.chapters[ch - 1]?.verses.find(x => x.verse === v);
      if (verse) {
        const text = verse.translations[settings.preferred_translation]?.text ?? '';
        return [{ verse, snippet: text.slice(0, 120) + (text.length > 120 ? '…' : '') }];
      }
      return [];
    }

    const matches: Result[] = [];
    for (const ch of data.chapters) {
      for (const v of ch.verses) {
        const transText = v.translations[settings.preferred_translation]?.text ?? '';
        const translit = v.transliteration.toLowerCase();
        const trans = transText.toLowerCase();
        const sansk = v.sanskrit.toLowerCase();

        if (trans.includes(q) || translit.includes(q) || sansk.includes(q)) {
          // Build snippet
          let snippet = transText;
          const idx = trans.indexOf(q);
          if (idx !== -1) {
            const start = Math.max(0, idx - 40);
            const end = Math.min(transText.length, idx + 80);
            snippet = (start > 0 ? '…' : '') + transText.slice(start, end) + (end < transText.length ? '…' : '');
          } else {
            snippet = transText.slice(0, 120) + (transText.length > 120 ? '…' : '');
          }
          matches.push({ verse: v, snippet });
          if (matches.length >= 100) break;
        }
      }
      if (matches.length >= 100) break;
    }
    return matches;
  }, [query, data, settings.preferred_translation]);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScreenHeader title="Search" />

      <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Ionicons name="search" size={18} color={c.textMuted} />
        <TextInput
          style={[styles.input, { color: c.text }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search or jump to verse (e.g. 4.4)…"
          placeholderTextColor={c.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.centered} color={c.primary} />
      ) : query.trim().length < 2 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={48} color={c.border} />
          <Text style={[styles.hint, { color: c.textMuted }]}>Type at least 2 characters to search</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.hint, { color: c.textMuted }]}>No results for "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => `${item.verse.chapter}-${item.verse.verse}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/verse/${item.verse.chapter}/${item.verse.verse}`)}
              style={[styles.resultRow, { backgroundColor: c.card, borderColor: c.cardBorder }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.verseRef, { color: c.accent }]}>
                BG {item.verse.chapter}.{item.verse.verse}
              </Text>
              <Text style={[styles.snippet, { color: c.text }]} numberOfLines={3}>
                {item.snippet}
              </Text>
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: c.textMuted }]}>
              {results.length}{results.length === 100 ? '+' : ''} results
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  resultRow: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 4 },
  verseRef: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  snippet: { fontSize: 14, lineHeight: 21 },
  resultCount: { fontSize: 12, marginBottom: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  hint: { fontSize: 14, textAlign: 'center' },
});
