import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGitaData } from '@/src/hooks/useGitaData';
import { useSettings } from '@/src/hooks/useSettings';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/theme';
import type { Chapter, Verse } from '@/src/types';

interface SearchResult {
  verse: Verse;
  snippet: string;
}

export default function BrowseScreen() {
  const c = useTheme();
  const { data, loading } = useGitaData();
  const { settings } = useSettings();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const results: SearchResult[] = useMemo(() => {
    if (!data || query.trim().length < 2) return [];
    const q = query.toLowerCase();

    // Direct chapter.verse lookup (e.g. "4.4")
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

    const matches: SearchResult[] = [];
    for (const ch of data.chapters) {
      for (const v of ch.verses) {
        const transText = v.translations[settings.preferred_translation]?.text ?? '';
        const translit = v.transliteration.toLowerCase();
        const trans = transText.toLowerCase();
        const sansk = v.sanskrit.toLowerCase();
        if (trans.includes(q) || translit.includes(q) || sansk.includes(q)) {
          const idx = trans.indexOf(q);
          let snippet: string;
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

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery('');
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScreenHeader
        title="Browse"
        subtitle={searchOpen ? undefined : '18 Chapters · 700 Verses'}
        right={
          <TouchableOpacity onPress={searchOpen ? closeSearch : openSearch} hitSlop={12}>
            <Ionicons
              name={searchOpen ? 'close' : 'search-outline'}
              size={22}
              color={c.primary}
            />
          </TouchableOpacity>
        }
      />

      {/* Search bar — shown when search is open */}
      {searchOpen && (
        <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="search" size={18} color={c.textMuted} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: c.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search Sanskrit, transliteration, or translation…"
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
      )}

      {/* Content */}
      {searchOpen ? (
        query.trim().length < 2 ? (
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
            keyboardShouldPersistTaps="handled"
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
        )
      ) : (
        <FlatList
          data={data?.chapters ?? []}
          keyExtractor={item => String(item.chapter)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ChapterRow chapter={item} c={c} />}
        />
      )}
    </View>
  );
}

function ChapterRow({ chapter, c }: { chapter: Chapter; c: ReturnType<typeof useTheme> }) {
  return (
    <TouchableOpacity
      onPress={() => router.push(`/chapter/${chapter.chapter}`)}
      style={[styles.row, { backgroundColor: c.card, borderColor: c.cardBorder }]}
      activeOpacity={0.7}
    >
      <View style={[styles.numBadge, { backgroundColor: c.surfaceAlt }]}>
        <Text style={[styles.numText, { color: c.primary }]}>{chapter.chapter}</Text>
      </View>
      <View style={styles.info}>
        {chapter.name ? (
          <Text style={[styles.chapterName, { color: c.sanskrit }]}>{chapter.name}</Text>
        ) : null}
        {chapter.name_transliterated ? (
          <Text style={[styles.transliteration, { color: c.text }]}>{chapter.name_transliterated}</Text>
        ) : (
          <Text style={[styles.transliteration, { color: c.text }]}>Chapter {chapter.chapter}</Text>
        )}
        {chapter.name_meaning ? (
          <Text style={[styles.meaning, { color: c.textSecondary }]}>{chapter.name_meaning}</Text>
        ) : null}
        <Text style={[styles.verseCount, { color: c.textMuted }]}>{chapter.verse_count} verses</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  // Chapter rows
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  numBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontSize: 18, fontWeight: '800' },
  info: { flex: 1 },
  chapterName: { fontSize: 14, fontWeight: '500' },
  transliteration: { fontSize: 15, fontWeight: '700' },
  meaning: { fontSize: 12, marginTop: 2 },
  verseCount: { fontSize: 11, marginTop: 3 },
  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
  // Search results
  resultRow: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 4 },
  verseRef: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  snippet: { fontSize: 14, lineHeight: 21 },
  resultCount: { fontSize: 12, marginBottom: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  hint: { fontSize: 14, textAlign: 'center' },
});
