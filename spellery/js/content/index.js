// The whole word list: seven shelves of five units, plus lookups the game needs.

import s1 from './shelf-1.js';
import s2 from './shelf-2.js';
import s3 from './shelf-3.js';
import s4 from './shelf-4.js';
import s5 from './shelf-5.js';
import s6 from './shelf-6.js';
import s7 from './shelf-7.js';
import { parseWord } from '../words.js';

export const SHELVES = [s1, s2, s3, s4, s5, s6, s7];

// Every unit, flat, with a link back to its shelf.
export const UNITS = [];
// Every word, keyed by its plain spelling.
export const WORDS = new Map();

SHELVES.forEach((shelf, shelfIndex) => {
  shelf.units.forEach((unit, index) => {
    UNITS.push({ unit, shelf, shelfIndex, index });
    unit.words.forEach((entry) => {
      const p = parseWord(entry.w);
      WORDS.set(p.w, {
        key: p.w,
        hard: p.hard,
        syl: p.syl,
        groups: p.groups,
        sentence: entry.s,
        wrong: entry.x || '',
        tip: entry.tip || '',
        from: entry.from || '',
        bin: entry.bin,
        unit,
        shelf,
        shelfIndex,
      });
    });
  });
});

const unitMap = new Map(UNITS.map((u) => [u.unit.id, u]));
export const findUnit = (id) => unitMap.get(id) || null;
export const wordsOf = (unit) => unit.words.map((entry) => WORDS.get(parseWord(entry.w).w));

export const TOTAL_UNITS = UNITS.length;
export const TOTAL_WORDS = WORDS.size;

// Two probe words per shelf for the first six shelves, easiest shelf first.
// The first shelf where she misses one is where she starts.
export const PLACEMENT = [
  ['truck', 'bridge'],
  ['paint', 'bright'],
  ['noise', 'caught'],
  ['knife', 'happen'],
  ['hopping', 'cried'],
  ['careful', 'question'],
];
