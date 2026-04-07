/**
 * Strips leading chapter.verse references from all translation text and commentary fields.
 * Handles formats:
 *   "6.3 ..."          (Sivananda, Gambhirananda, Shankaracharya EN)
 *   "6.3. ..."         (san)
 *   "।।6.3।। ..."      (Tejomayananda, Shankaracharya HI, Chinmayananda)
 *   "||6.3|| ..."      (legacy, already partly cleaned)
 *   "| |6.3| | ..."    (spaced pipes)
 */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const data = require('../assets/data/gita_data.json');

// Matches optional danda/pipe wrappers + chapter.verse + optional wrappers + trailing punctuation/space
function clean(text, chapter, verse) {
  if (!text) return text;
  const ref = `${chapter}\\.${verse}`;
  // Pattern covers: ||6.3||, ।।6.3।।, | |6.3| |, 6.3, 6.3.
  const pattern = new RegExp(
    `^[\\s]*(?:[|।]{1,2}[\\s]*)?${ref}[\\s]*(?:[|।]{1,2})?[.\\s]*`
  );
  return text.replace(pattern, '').trimStart();
}

let cleaned = 0;

for (const chapter of data.chapters) {
  for (const verse of chapter.verses) {
    for (const key of Object.keys(verse.translations)) {
      const t = verse.translations[key];
      if (!t) continue;
      const origText = t.text;
      const origComm = t.commentary;
      t.text = clean(t.text, verse.chapter, verse.verse);
      t.commentary = clean(t.commentary, verse.chapter, verse.verse);
      if (t.text !== origText || t.commentary !== origComm) cleaned++;
    }
  }
}

writeFileSync(
  new URL('../assets/data/gita_data.json', import.meta.url),
  JSON.stringify(data, null, 2)
);

console.log(`Done. Cleaned prefixes from ${cleaned} translation entries.`);
