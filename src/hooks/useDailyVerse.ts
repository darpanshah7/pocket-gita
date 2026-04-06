import { useState, useEffect } from 'react';
import { getSetting, setSetting, addToHistory } from '../db/queries';
import { useGitaData } from './useGitaData';
import type { Verse } from '../types';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function randomIndexExcluding(total: number, exclude: number): number {
  if (total <= 1) return 0;
  let idx: number;
  do {
    idx = Math.floor(Math.random() * total);
  } while (idx === exclude);
  return idx;
}

export function useDailyVerse() {
  const { data, loading, getVerseByIndex } = useGitaData();
  const [verseIndex, setVerseIndex] = useState<number | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (loading || !data) return;

    async function resolve() {
      const total = data!.flat_verses.length;
      const lastDate = await getSetting('last_verse_date');
      const lastIndex = await getSetting('last_verse_index');
      const order = await getSetting('verse_order');
      const today = todayStr();

      if (lastDate === today) {
        setVerseIndex(lastIndex as number);
        setResolved(true);
        return;
      }

      let nextIndex: number;
      const isFirstEver = !lastDate || (lastIndex as number) < 0;
      if (order === 'sequential') {
        nextIndex = isFirstEver ? 0 : ((lastIndex as number) + 1) % total;
      } else {
        nextIndex = isFirstEver ? 0 : randomIndexExcluding(total, lastIndex as number);
      }

      await setSetting('last_verse_index', nextIndex);
      await setSetting('last_verse_date', today);

      // Record in history
      const ref = data!.flat_verses[nextIndex];
      if (ref) {
        addToHistory(ref.chapter, ref.verse, today).catch(() => {});
      }

      setVerseIndex(nextIndex);
      setResolved(true);
    }

    resolve();
  }, [loading, data]);

  const verse: Verse | undefined =
    verseIndex !== null ? getVerseByIndex(verseIndex) : undefined;

  return { verse, resolved, verseIndex };
}
