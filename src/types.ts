export type TranslationKey = 'siva' | 'gambir' | 'chinmay' | 'tej' | 'prabhu' | 'san' | 'vallabh' | 'ramanHt' | 'sankarEt' | 'sankarHt';


export const TRANSLATION_LABELS: Record<TranslationKey, string> = {
  siva:     'Swami Sivananda (English)',
  gambir:   'Swami Gambhirananda (English)',
  chinmay:  'Swami Chinmayananda (Hindi)',
  tej:      'Swami Tejomayananda (Hindi)',
  prabhu:   'Swami Prabhupada (English)',
  san:      'Dr. S. Sankaranarayan (English)',
  vallabh:  'Shri Vallabhacharya (Hindi)',
  ramanHt:  'Sri Ramanuja (Hindi)',
  sankarEt: 'Adi Shankaracharya (English)',
  sankarHt: 'Adi Shankaracharya (Hindi)',
};

// English first, Hindi last
export const TRANSLATION_KEYS: TranslationKey[] = ['siva', 'gambir', 'prabhu', 'sankarEt', 'tej', 'ramanHt', 'sankarHt', 'chinmay'];

export interface Translation {
  text: string;
  commentary: string;
}

export interface Verse {
  chapter: number;
  verse: number;
  speaker: string;
  sanskrit: string;
  transliteration: string;
  translations: Partial<Record<TranslationKey, Translation>>;
}

export interface Chapter {
  chapter: number;
  name: string;
  name_transliterated: string;
  name_meaning: string;
  summary: string;
  verse_count: number;
  verses: Verse[];
}

export interface FlatVerseRef {
  chapter: number;
  verse: number;
}

export interface GitaData {
  meta: {
    source: string;
    source_url: string;
    license: string;
    translations: Record<string, string>;
    total_verses: number;
    generated_at: string;
  };
  chapters: Chapter[];
  flat_verses: FlatVerseRef[];
}

export interface Favorite {
  chapter: number;
  verse: number;
  created_at: string;
}

export interface Note {
  chapter: number;
  verse: number;
  body: string;
  updated_at: string;
}

export type VerseOrder = 'sequential' | 'random';
export type PreferredLanguage = 'english' | 'sanskrit';

const SPEAKER_EN: Record<string, string> = {
  'धृतराष्ट्र': 'Dhritarashtra',
  'सञ्जय':      'Sanjay',
  'अर्जुन':     'Arjun',
  'श्रीभगवान्': 'Shri Bhagavan',
};

export function resolveSpeaker(speaker: string, language: PreferredLanguage): string {
  if (language === 'english') return SPEAKER_EN[speaker] ?? speaker;
  return speaker;
}
export type BrowseScrollMode = 'list' | 'pager';
export type AppTheme = 'light' | 'dark' | 'system';

export interface AppSettings {
  notification_time: string;      // "HH:MM"
  verse_order: VerseOrder;
  preferred_translation: TranslationKey;
  preferred_language: PreferredLanguage;
  browse_scroll_mode: BrowseScrollMode;
  text_size: number;              // multiplier: 0.85 | 1.0 | 1.15 | 1.3
  last_verse_index: number;
  last_verse_date: string;        // "YYYY-MM-DD"
  notifications_enabled: boolean;
  theme: AppTheme;
}

export const DEFAULT_SETTINGS: AppSettings = {
  notification_time: '07:00',
  verse_order: 'sequential',
  preferred_translation: 'siva',
  preferred_language: 'english',
  browse_scroll_mode: 'list',
  text_size: 1.0,
  last_verse_index: -1,
  last_verse_date: '',
  notifications_enabled: false,
  theme: 'system',
};
