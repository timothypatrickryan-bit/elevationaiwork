#!/usr/bin/env node
// Lists everything the game's recorded voice has to say, as JSON on standard
// output. tools/make-voice.py reads this list and makes the clips in audio/.
//
//   node tools/voice-list.mjs > /tmp/voice-list.json
//
// Each entry: { pack, kind, text, word }
//   pack   the file the clip goes into (one per jar, plus "ui")
//   kind   word | slow | sentence | ui
//   text   exactly what is spoken; the game looks clips up by this text
//   word   for a sentence, the target word inside it

import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { SHELVES, WORDS, wordsOf } = await import(pathToFileURL(resolve(root, 'js/content/index.js')).href);
const { fullSentence } = await import(pathToFileURL(resolve(root, 'js/words.js')).href);
const { UI_LINES } = await import(pathToFileURL(resolve(root, 'js/voice-lines.js')).href);

const out = [];
const seen = new Set();
const add = (pack, kind, text, word = '') => {
  const key = (kind === 'slow' ? '~' : '') + text;
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ pack, kind, text, word });
};

for (const line of Object.values(UI_LINES)) add('ui', 'ui', line);

for (const shelf of SHELVES) {
  for (const unit of shelf.units) {
    for (const w of wordsOf(unit)) {
      add(unit.id, 'word', w.key);
      add(unit.id, 'slow', w.key);
      add(unit.id, 'sentence', fullSentence(w.sentence, w.key), w.key);
    }
    const sort = unit.sort;
    if (!sort || !sort.cards) continue;
    for (const card of sort.cards) {
      if (sort.sets) add(unit.id, 'sentence', fullSentence(card[0], card[1]), card[1]);
      else if (card[0].includes('*')) add(unit.id, 'sentence', fullSentence(card[0], sort.bins[card[1]]), sort.bins[card[1]]);
      else if (!WORDS.has(card[2])) add(unit.id, 'word', card[2]);
    }
  }
}

process.stdout.write(JSON.stringify(out, null, 1));
