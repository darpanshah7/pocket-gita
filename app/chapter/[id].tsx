import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, useWindowDimensions, ScrollView, Modal, Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGitaData } from '@/src/hooks/useGitaData';
import { useSettings } from '@/src/hooks/useSettings';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/theme';
import type { Chapter, Verse, TranslationKey } from '@/src/types';
import { TRANSLATION_KEYS } from '@/src/types';

type ListItem = { type: 'intro' } | { type: 'verse'; verse: Verse };

export default function ChapterScreen() {
  const c = useTheme();
  const { id, verse: verseParam } = useLocalSearchParams<{ id: string; verse?: string }>();
  const chapterNum = parseInt(id ?? '1', 10);
  const initialVerseIndex = verseParam ? parseInt(verseParam, 10) : 0; // 0 = intro card
  const { getChapter, loading } = useGitaData();
  const { settings, loaded } = useSettings();
  const { width } = useWindowDimensions();

  const chapter = getChapter(chapterNum);
  const [modeOverride, setModeOverride] = useState<'list' | 'pager' | null>(null);
  const mode = modeOverride ?? (loaded ? settings.browse_scroll_mode : 'list');
  const [cardHeight, setCardHeight] = useState(0);
  const [showVersePicker, setShowVersePicker] = useState(false);

  // Global script toggle — shared across all verse cards
  const [showSanskrit, setShowSanskrit] = useState(false);
  useEffect(() => {
    if (loaded) setShowSanskrit(settings.preferred_language === 'sanskrit');
  }, [loaded]);

  // Track scroll position so mode toggle doesn't reset to beginning.
  // Use a ref (not just state) so the onLayout callback always reads the latest value.
  const currentIndexRef = useRef(0);
  const pagerRef = useRef<FlatList<ListItem>>(null);
  const listRef  = useRef<FlatList<ListItem>>(null);
  const introScrollRef = useRef<ScrollView>(null);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      const newIdx = viewableItems[0].index;
      // Reset intro card scroll to top whenever it becomes the active card
      if (newIdx === 0 && currentIndexRef.current !== 0) {
        introScrollRef.current?.scrollTo({ y: 0, animated: false });
      }
      currentIndexRef.current = newIdx;
    }
  }).current;

  // Called once each FlatList has finished its own layout — scroll imperatively.
  const handlePagerLayout = useCallback(() => {
    const idx = currentIndexRef.current > 0 ? currentIndexRef.current : initialVerseIndex;
    if (idx > 0) pagerRef.current?.scrollToIndex({ index: idx, animated: false });
  }, [initialVerseIndex]);
  const handleListLayout = useCallback(() => {
    const idx = currentIndexRef.current > 0 ? currentIndexRef.current : initialVerseIndex;
    if (idx > 0) listRef.current?.scrollToIndex({ index: idx, animated: false });
  }, [initialVerseIndex]);

  // Local browse text size (does not persist to settings)
  const BROWSE_TEXT_STEPS = [0.75, 0.85, 1.0, 1.15, 1.3];
  const [browseTextIdx, setBrowseTextIdx] = useState(2); // 1.0 centre
  const browseTextMult = BROWSE_TEXT_STEPS[browseTextIdx];
  const canDecrBrowse = browseTextIdx > 0;
  const canIncrBrowse = browseTextIdx < BROWSE_TEXT_STEPS.length - 1;

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (!chapter) {
    return (
      <View style={[styles.loading, { backgroundColor: c.background }]}>
        <Text style={{ color: c.textMuted }}>Chapter not found.</Text>
      </View>
    );
  }

  // Chapter intro card + all verses
  const listData: ListItem[] = [
    { type: 'intro' },
    ...chapter.verses.map(v => ({ type: 'verse' as const, verse: v })),
  ];

  // Header title: transliterated when English, Sanskrit script otherwise
  const headerTitle = settings.preferred_language === 'english'
    ? (chapter.name_transliterated || chapter.name || `Chapter ${chapter.chapter}`)
    : (chapter.name || `Chapter ${chapter.chapter}`);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScreenHeader
        showBack
        title={headerTitle}
        subtitle={chapter.name_meaning || `${chapter.verse_count} verses`}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity onPress={() => canDecrBrowse && setBrowseTextIdx(i => i - 1)} hitSlop={10} disabled={!canDecrBrowse}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: canDecrBrowse ? c.primary : c.border }}>A−</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => canIncrBrowse && setBrowseTextIdx(i => i + 1)} hitSlop={10} disabled={!canIncrBrowse}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: canIncrBrowse ? c.primary : c.border }}>A+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModeOverride(m => (m ?? mode) === 'list' ? 'pager' : 'list')}
              hitSlop={12}
            >
              <Ionicons
                name={mode === 'pager' ? 'list-outline' : 'albums-outline'}
                size={22}
                color={c.primary}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <View style={{ flex: 1 }} onLayout={e => setCardHeight(e.nativeEvent.layout.height)}>
        {cardHeight > 0 && (
          mode === 'pager' ? (
            <FlatList
              ref={pagerRef}
              data={listData}
              keyExtractor={item => item.type === 'intro' ? 'intro' : String(item.verse.verse)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
              viewabilityConfig={viewabilityConfig}
              onViewableItemsChanged={onViewableItemsChanged}
              onLayout={handlePagerLayout}
              renderItem={({ item }) =>
                item.type === 'intro' ? (
                  <ChapterIntroCard chapter={chapter} c={c} width={width} height={cardHeight} textScale={settings.text_size * browseTextMult} onVersePickerPress={() => setShowVersePicker(true)} mode="pager" scrollRef={introScrollRef}
                    onSwipeToNext={() => pagerRef.current?.scrollToIndex({ index: 1, animated: true })} />
                ) : (
                  <VerseContent
                    verse={item.verse}
                    chapterNum={chapterNum}
                    totalVerses={chapter.verse_count}
                    preferredTranslation={settings.preferred_translation}
                    c={c}
                    width={width}
                    height={cardHeight}
                    textScale={settings.text_size * browseTextMult}
                    showSanskrit={showSanskrit}
                    onToggleSanskrit={() => setShowSanskrit(s => !s)}
                    onVerseBadgePress={() => setShowVersePicker(true)}
                  />
                )
              }
            />
          ) : (
            <FlatList
              ref={listRef}
              data={listData}
              keyExtractor={item => item.type === 'intro' ? 'intro' : String(item.verse.verse)}
              snapToInterval={cardHeight}
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              getItemLayout={(_, index) => ({ length: cardHeight, offset: cardHeight * index, index })}
              viewabilityConfig={viewabilityConfig}
              onViewableItemsChanged={onViewableItemsChanged}
              onLayout={handleListLayout}
              renderItem={({ item }) =>
                item.type === 'intro' ? (
                  <ChapterIntroCard chapter={chapter} c={c} width={width} height={cardHeight} textScale={settings.text_size * browseTextMult} onVersePickerPress={() => setShowVersePicker(true)} mode="list" scrollRef={introScrollRef}
                    onSwipeToNext={() => listRef.current?.scrollToIndex({ index: 1, animated: true })} />
                ) : (
                  <VerseContent
                    verse={item.verse}
                    chapterNum={chapterNum}
                    totalVerses={chapter.verse_count}
                    preferredTranslation={settings.preferred_translation}
                    c={c}
                    width={width}
                    height={cardHeight}
                    textScale={settings.text_size * browseTextMult}
                    showSanskrit={showSanskrit}
                    onToggleSanskrit={() => setShowSanskrit(s => !s)}
                    onVerseBadgePress={() => setShowVersePicker(true)}
                  />
                )
              }
            />
          )
        )}
      </View>

      {/* Verse picker modal */}
      <Modal visible={showVersePicker} transparent animationType="fade" onRequestClose={() => setShowVersePicker(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setShowVersePicker(false)}>
          <Pressable style={[styles.pickerSheet, { backgroundColor: c.surface, borderColor: c.cardBorder }]} onPress={() => {}}>
            <Text style={[styles.pickerTitle, { color: c.accent }]}>Jump to verse</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.pickerGrid}>
                {chapter.verses.map(v => (
                  <TouchableOpacity
                    key={v.verse}
                    style={[styles.pickerItem, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                    onPress={() => {
                      setShowVersePicker(false);
                      // index = verse number (intro is 0, verse 1 is index 1)
                      const idx = v.verse;
                      const ref = mode === 'pager' ? pagerRef : listRef;
                      ref.current?.scrollToIndex({ index: idx, animated: true });
                    }}
                  >
                    <Text style={[styles.pickerItemText, { color: c.primary }]}>{v.verse}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ChapterIntroCard({
  chapter, c, width, height, textScale, onVersePickerPress, onSwipeToNext, mode, scrollRef,
}: {
  chapter: Chapter;
  c: ReturnType<typeof useTheme>;
  width: number;
  height: number;
  textScale: number;
  mode?: 'list' | 'pager';
  scrollRef?: React.RefObject<ScrollView>;
  onVersePickerPress?: () => void;
  onSwipeToNext?: () => void;
}) {
  const BASE_HEIGHT = 500;
  const scale = Math.min(Math.max(height / BASE_HEIGHT, 1.0), 1.9) * textScale;
  const fs = (n: number) => Math.round(n * scale);

  const containerHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const [innerScrollEnabled, setInnerScrollEnabled] = useState(false);

  function updateScrollEnabled() {
    setInnerScrollEnabled(contentHeightRef.current > containerHeightRef.current + 2);
  }

  return (
    <View style={{ width, height }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.cardContent, { backgroundColor: c.background }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={innerScrollEnabled}
        nestedScrollEnabled
        onLayout={e => {
          containerHeightRef.current = e.nativeEvent.layout.height;
          updateScrollEnabled();
        }}
        onContentSizeChange={(_w, h) => {
          contentHeightRef.current = h;
          updateScrollEnabled();
        }}
        onScrollEndDrag={e => {
          const { contentOffset, contentSize, layoutMeasurement, velocity } = e.nativeEvent;
          const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 4;
          if (atBottom && (velocity?.y ?? 0) < -0.3) {
            onSwipeToNext?.();
          }
        }}
      >
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardBorder, minHeight: height - 48 }]}>
          {/* Inline chapter badge — tap to jump to a verse */}
          <TouchableOpacity style={[styles.introBadge, { backgroundColor: c.surfaceAlt }]} onPress={onVersePickerPress} hitSlop={8}>
            <Text style={[styles.introBadgeLabel, { color: c.textMuted, fontSize: fs(9) }]}>Chapter</Text>
            <Text style={[styles.introBadgeNum, { color: c.primary, fontSize: fs(15) }]}>{chapter.chapter}</Text>
          </TouchableOpacity>

          {chapter.name ? (
            <Text style={[styles.introSanskrit, { color: c.sanskrit, fontSize: fs(20), lineHeight: fs(30) }]}>
              {chapter.name}
            </Text>
          ) : null}

          {chapter.name_transliterated ? (
            <Text style={[styles.introTranslit, { color: c.text, fontSize: fs(17), lineHeight: fs(24) }]}>
              {chapter.name_transliterated}
            </Text>
          ) : null}

          {chapter.name_meaning ? (
            <Text style={[styles.introMeaning, { color: c.accent, fontSize: fs(13), lineHeight: fs(20) }]}>
              {chapter.name_meaning}
            </Text>
          ) : null}

          <View style={[styles.introDivider, { backgroundColor: c.border }]} />

          {chapter.summary ? (
            <Text style={[styles.introSummary, { color: c.textSecondary, fontSize: fs(13), lineHeight: fs(21) }]}>
              {chapter.summary}
            </Text>
          ) : null}

          <Text style={[styles.introVerseCount, { color: c.textMuted, fontSize: fs(10) }]}>
            {chapter.verse_count} verses · {mode === 'pager' ? 'swipe left' : 'swipe up'} to begin reading
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function VerseContent({
  verse,
  chapterNum,
  totalVerses,
  preferredTranslation,
  c,
  width,
  height,
  textScale,
  showSanskrit,
  onToggleSanskrit,
  onVerseBadgePress,
}: {
  verse: Verse;
  chapterNum: number;
  totalVerses: number;
  preferredTranslation: TranslationKey;
  c: ReturnType<typeof useTheme>;
  width: number;
  height: number;
  textScale: number;
  showSanskrit: boolean;
  onToggleSanskrit: () => void;
  onVerseBadgePress?: () => void;
}) {
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
  const lines = verse.transliteration
    .split('\n')
    .flatMap(line => splitHemistich(line.replace(/ \.$/, '').replace(/\./g, ' ').trim()))
    .filter(p => p.length > 0);
  const translationKey = verse.translations[preferredTranslation]
    ? preferredTranslation
    : TRANSLATION_KEYS.find(k => verse.translations[k]);
  const translationObj = translationKey ? verse.translations[translationKey] : undefined;

  const BASE_HEIGHT = 480;
  const scaleScript = Math.min(Math.max(height / BASE_HEIGHT, 1.0), 2.2) * textScale;
  const scaleTrans  = Math.min(Math.max(height / BASE_HEIGHT, 1.0), 1.35) * textScale;
  const fsS = (n: number) => Math.round(n * scaleScript);
  const fsT = (n: number) => Math.round(n * scaleTrans);

  return (
    <View style={{ width, height }}>
      <ScrollView
        contentContainerStyle={[styles.cardContent, { backgroundColor: c.background }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardBorder, minHeight: height - 48 }]}>
          {/* Header — fixed small */}
          <View style={styles.cardHeader}>
            <TouchableOpacity style={[styles.numBadge, { backgroundColor: c.surfaceAlt }]} onPress={onVerseBadgePress} hitSlop={8}>
              <Text style={[styles.numText, { color: c.primary }]}>
                {chapterNum}.{verse.verse}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.ofTotal, { color: c.textMuted }]}>of {totalVerses}</Text>
            <TouchableOpacity
              onPress={() => router.push(`/verse/${chapterNum}/${verse.verse}`)}
              hitSlop={8}
              style={styles.fullLink}
            >
              <Text style={[styles.fullLinkText, { color: c.primary }]}>Full verse</Text>
              <Ionicons name="open-outline" size={12} color={c.primary} />
            </TouchableOpacity>
          </View>

          {/* Script — tap to toggle (state shared across all cards) */}
          <TouchableOpacity
            onPress={onToggleSanskrit}
            style={[styles.scriptBlock, { borderColor: c.border }]}
            activeOpacity={0.8}
          >
            <View style={styles.scriptLabelRow}>
              <Text style={[styles.scriptLabel, { color: c.accent }]}>
                {showSanskrit ? 'Sanskrit' : 'Transliteration'}
              </Text>
              <Text style={[styles.scriptHint, { color: c.textMuted }]}>
                Tap · {showSanskrit ? 'see transliteration' : 'see Sanskrit'}
              </Text>
            </View>
            {showSanskrit ? (
              <View style={{ alignItems: 'center', paddingTop: 4 }}>
                {verse.sanskrit.split('\n')
                  .flatMap(line => splitHemistich(line.replace(/ \|$/, '').trim()))
                  .filter(p => p.length > 0)
                  .map((pada, i) => (
                    <Text key={i} style={[styles.sanskrit, { color: c.sanskrit, fontSize: fsS(19), lineHeight: fsS(32), textAlign: 'center', marginBottom: 4 }]}>
                      {pada}
                    </Text>
                  ))}
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingTop: 4 }}>
                {lines.map((pada, i) => (
                  <Text key={i} style={[styles.transLine, { color: c.transliteration, fontSize: fsS(15), lineHeight: fsS(26), textAlign: 'center', marginBottom: 4 }]}>
                    {pada}
                  </Text>
                ))}
              </View>
            )}
          </TouchableOpacity>

          {/* Translation */}
          {translationObj ? (
            <Text
              style={[styles.translation, { color: c.text, fontSize: fsT(13), lineHeight: fsT(21) }]}
              numberOfLines={6}
              ellipsizeMode="tail"
            >
              {translationObj.text}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={() => router.push(`/verse/${chapterNum}/${verse.verse}`)}
            style={styles.moreRow}
            hitSlop={8}
          >
            <Text style={[styles.moreText, { color: c.primary }]}>Commentary & notes</Text>
            <Ionicons name="chevron-forward" size={12} color={c.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardContent: { padding: 16, paddingBottom: 32 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },

  // Intro card
  introBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  introBadgeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  introBadgeNum: { fontSize: 18, fontWeight: '800' },
  introSanskrit: { fontSize: 20, lineHeight: 30, fontWeight: '500', letterSpacing: 0.5 },
  introTranslit: { fontSize: 17, fontWeight: '700', lineHeight: 24 },
  introMeaning: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, lineHeight: 20 },
  introDivider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  introSummary: { fontSize: 13, lineHeight: 21, fontStyle: 'italic' },
  introVerseCount: { fontSize: 11, marginTop: 4, fontWeight: '500' },

  // Verse card header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  numBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  numText: { fontSize: 13, fontWeight: '700' },
  ofTotal: { fontSize: 12, flex: 1 },
  fullLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  fullLinkText: { fontSize: 12, fontWeight: '600' },

  // Script block
  scriptBlock: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  scriptLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scriptLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  scriptHint: { fontSize: 10, fontWeight: '500' },
  sanskrit: { fontSize: 20, lineHeight: 34, fontWeight: '400', letterSpacing: 0.5 },
  transLine: { fontSize: 18, lineHeight: 28, fontStyle: 'italic', letterSpacing: 0.3, marginBottom: 4 },

  translation: { fontSize: 15, lineHeight: 24 },

  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
  },
  moreText: { fontSize: 12, fontWeight: '600' },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerSheet: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  pickerItem: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
