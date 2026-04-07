/**
 * Fetches raman.ht, sankar.et, sankar.ht for all 701 verses
 * and merges them into the existing gita_data.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const data = require('../assets/data/gita_data.json');

const BASE = 'https://raw.githubusercontent.com/vedicscriptures/bhagavad-gita/main/slok';

async function fetchVerse(chapter, verse) {
  const url = `${BASE}/bhagavadgita_chapter_${chapter}_slok_${verse}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let fetched = 0;
let errors = 0;

for (const chapter of data.chapters) {
  for (const verse of chapter.verses) {
    try {
      const raw = await fetchVerse(verse.chapter, verse.verse);

      // raman — Hindi translation
      const raman = raw.raman;
      if (raman) {
        verse.translations.ramanHt = {
          text: raman.ht ?? '',
          commentary: raman.hc ?? '',
        };
      }

      // sankar — English translation
      const sankar = raw.sankar;
      if (sankar) {
        verse.translations.sankarEt = {
          text: sankar.et ?? '',
          commentary: sankar.ec ?? '',
        };
        verse.translations.sankarHt = {
          text: sankar.ht ?? '',
          commentary: sankar.hc ?? '',
        };
      }

      fetched++;
      process.stdout.write(`\r✓ ${fetched} / 701 (errors: ${errors})`);
      await sleep(80); // be polite to GitHub
    } catch (e) {
      errors++;
      console.error(`\nError at ${verse.chapter}.${verse.verse}: ${e.message}`);
    }
  }
}

writeFileSync(
  new URL('../assets/data/gita_data.json', import.meta.url),
  JSON.stringify(data, null, 2)
);

console.log(`\n\nDone. Fetched: ${fetched}, Errors: ${errors}`);
