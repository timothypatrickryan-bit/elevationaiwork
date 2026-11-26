#!/usr/bin/env node
// Checks everything in js/content/ that a machine can check.
//
//   node tools/validate-content.mjs [--dict words.txt] [--list]
//
// It cannot tell whether an answer is TRUE (whether "glad" really means
// "happy"); a person has to read for that. It does catch the slips that creep
// in when lists are edited: an item with no right answer, the same word offered
// twice, a "wrong" compound half that happens to make a real word, a word
// placed in two word-kind lists, a mission with too few items.
//
// --dict FILE  one English word per line. With it, every right answer made of
//              plain words must be in the dictionary, wrong spellings must not
//              be, and compound halves are checked both ways.
// --list       print every item in a form that is quick to read through.

import { readFileSync } from 'node:fs';
import { SKILLS, SECTORS, MISSIONS, TRAINING, bare } from '../js/content/index.js';
import { NOUNS, VERBS, ADJECTIVES, SPOT } from '../js/content/words.js';
import { COMPOUND, PLURALS, PAST } from '../js/content/parts.js';
import { SPELLING, HOMOPHONES, SOUND_ALIKE_MEANS, ABC } from '../js/content/sounds.js';
import { CAPITALS, ORDER } from '../js/content/sentences.js';
import { PASSAGES } from '../js/content/reading.js';

const args = process.argv.slice(2);
const dictAt = args.indexOf('--dict');
const dict = dictAt >= 0 ? new Set(readFileSync(args[dictAt + 1], 'utf8').split(/\r?\n/).map((w) => w.trim().toLowerCase()).filter(Boolean)) : null;
const errors = [];
const warnings = [];
const err = (where, what) => errors.push(`${where}: ${what}`);
const warn = (where, what) => warnings.push(`${where}: ${what}`);
// A word with an apostrophe counts if its front part is a word (they're, pilot's).
const isWord = (w) => !dict || dict.has(w.toLowerCase()) || (/['’]/.test(w) && dict.has(w.toLowerCase().split(/['’]/)[0])) || NAMES.has(w.toLowerCase());
const NAMES = new Set('monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december mars venus saturn jupiter neptune earth canada japan mexico thanksgiving texas'.split(' '));
const wordsIn = (text) => text.replace(/[“”".,!?▢:;()]/g, ' ').replace(/[[\]*_]/g, ' ').split(/\s+/).filter((w) => /[a-z]/i.test(w));
const EXTRA = new Set(['blip', 'zed', 'ana', 'mira', 'leo', 'kai', 'rex', 'mia', 'sam', 'ben', 'diaz', 'kim', 'lee', 'rosa', 'garbler', 'garble', 'quillfire', 'pew', 'yikes', 'ouch', 'hooray', 'yay', 'wow', "let's", 'everest', 'nile', 'ohio', 'boston', 'texas', 'austin', 'pregame']);
const known = (w) => isWord(w) || EXTRA.has(w.toLowerCase()) || /^\d+$/.test(w) || (w.includes('-') && w.split('-').every((part) => !part || known(part)));

// ---- every item, whatever its skill
const keys = new Set();
let count = 0;
for (const skill of Object.values(SKILLS)) {
  if (!skill.title || !skill.name || !skill.rule || !skill.tip) err(skill.id, 'needs a title, a name, a rule and a tip');
  if (!skill.teach || skill.teach.length < 2) err(skill.id, 'needs at least two teaching lines');
  if (!skill.show || !skill.show.length) err(skill.id, 'needs at least one example for the briefing');
  for (const item of skill.items) {
    count++;
    const at = item.key;
    if (keys.has(at)) err(at, 'this key is used twice');
    keys.add(at);
    if (!item.prompt || !item.prompt.ask) err(at, 'has no question');
    if (!item.why) err(at, 'has no note for a miss');
    if (![1, 2, 3].includes(item.lv)) err(at, `level ${item.lv} is not 1, 2 or 3`);
    if (item.kind === 'pick' || item.kind === 'bins') {
      const right = item.options.filter((o) => o.ok);
      if (right.length !== 1) err(at, `has ${right.length} right answers`);
      const labels = item.options.map((o) => o.label);
      if (new Set(labels.map((l) => l.toLowerCase())).size !== labels.length) err(at, `offers the same answer twice: ${labels.join(' | ')}`);
      if (item.kind === 'pick' && (labels.length < 2 || labels.length > 4)) err(at, `has ${labels.length} answers; 2 to 4 fit on screen`);
      for (const l of labels) {
        if (!l.trim()) err(at, 'has an empty answer');
        if (l.length > 38) err(at, `answer is too long to fit (${l.length} letters): ${l}`);
      }
      if (labels.some((l) => l.length > 14) && labels.length > 3) err(at, 'long answers only fit three to a wave');
    } else if (item.kind === 'tap') {
      if (!item.tokens.some((t) => t.ok)) err(at, 'has no word to tap');
      if (item.tokens.every((t) => t.ok)) err(at, 'every word is right, so there is nothing to decide');
      if (item.tokens.length > 9) err(at, `${item.tokens.length} words is too many for one wave`);
    } else if (item.kind === 'order') {
      if (item.seq.length < 3 || item.seq.length > 7) err(at, `${item.seq.length} steps; 3 to 7 work`);
      if (new Set(item.seq).size !== item.seq.length) err(at, 'has the same word twice, so the order is not clear');
    } else err(at, `unknown kind ${item.kind}`);
    const text = (item.prompt.text || '') + ' ' + (item.prompt.big || '');
    if ((item.prompt.text || '').length > 120) err(at, 'the sentence is too long for the banner');
    if (dict) for (const w of wordsIn(text)) if (!known(w) && !['+', '?'].includes(w) && skill.id !== 'spelling' && !/^-?[a-z]+-$|^-[a-z]+$/.test(w)) warn(at, `“${w}” in the question is not in the dictionary`);
  }
  // enough items for the mission plan, at every level it may be played at
  for (const [view, n] of skill.plan) {
    const have = view === 'sort' ? (skill.words || []).filter((w) => w.ok).length : view === 'pick' && skill.words ? 99 : skill.items.filter((i) => i.kind === view).length;
    if (have < n) err(skill.id, `the plan asks for ${n} ${view} items but there are ${have}`);
  }
}

// ---- kinds of words
const all = [...Object.values(NOUNS).flat().map((w) => ['noun', w]), ...VERBS.map((w) => ['verb', w]), ...ADJECTIVES.map((w) => ['adjective', w])];
const seen = new Map();
for (const [pos, w] of all) {
  if (seen.has(w)) err('words.js', `“${w}” is listed as ${seen.get(w)} and as ${pos}`);
  seen.set(w, pos);
  if (!known(w)) err('words.js', `“${w}” is not in the dictionary`);
  if (w.length > 11) warn('words.js', `“${w}” is long for a ship's label`);
}
for (const row of SPOT) {
  const words = row.s.split(' ').map(bare);
  for (const [name, wanted] of [['noun', row.n], ['verb', row.v], ['adjective', row.a]]) {
    for (const w of wanted.split(' ')) {
      if (words.filter((x) => x === w).length !== 1) err('SPOT', `“${w}” (${name}) should appear exactly once in: ${row.s}`);
    }
  }
  if (row.v.includes(' ') || row.a.includes(' ')) err('SPOT', `one verb and one adjective per sentence: ${row.s}`);
  const others = words.filter((w) => !`${row.n} ${row.v} ${row.a}`.split(' ').includes(w));
  for (const w of others) if (!['the', 'a', 'an', 'on', 'at', 'to'].includes(w)) err('SPOT', `“${w}” is not tagged in: ${row.s}`);
}

// ---- compound words
if (dict) {
  for (const [first, a, ...wrong] of COMPOUND.join) {
    if (!dict.has(first + a)) err('compound', `${first}+${a} is not in the dictionary`);
    for (const w of wrong) if (dict.has(first + w)) err('compound', `${first}+${w} is meant to be wrong but “${first}${w}” is a word`);
  }
  for (const row of [...COMPOUND.spot, ...COMPOUND.mean.map((r) => r.slice(1))]) for (const w of row) if (!dict.has(w)) err('compound', `“${w}” is not in the dictionary`);
  // wrong spellings must not be words; right ones must be
  for (const lv of Object.keys(SPELLING)) {
    for (const [a, ...wrong] of SPELLING[lv]) {
      if (!isWord(a)) err('spelling', `“${a}” is not in the dictionary`);
      // A big dictionary holds many old and rare words, so this is only a note:
      // "wich" is in there, and it is still the right wrong spelling of "which".
      for (const w of wrong) if (dict.has(w.toLowerCase())) warn('spelling', `“${w}” (a wrong spelling of “${a}”) is in the dictionary; make sure it is not a word a child would know`);
    }
  }
  for (const [name, groups] of [['plurals', PLURALS], ['past', PAST]]) {
    for (const lv of Object.keys(groups)) {
      for (const [q, a, ...wrong] of groups[lv]) {
        if (!dict.has(q) || !dict.has(a)) err(name, `“${q}” or “${a}” is not in the dictionary`);
        for (const w of wrong) if (dict.has(w)) warn(name, `“${w}” (a wrong answer for ${q}) is a real word in its own right`);
      }
    }
  }
  // the plain-word answers of the meaning skills
  for (const id of ['synonyms', 'antonyms', 'rhymes', 'shades', 'multi', 'context', 'prefixes', 'suffixes', 'sayings', 'compound', 'homophones', 'pronouns', 'agreement', 'conjunctions']) {
    for (const item of SKILLS[id].items) for (const o of item.options) for (const w of wordsIn(o.label)) if (!known(w)) err(item.key, `“${w}” in the answer “${o.label}” is not in the dictionary`);
  }
}

// ---- sound-alikes, ABC order, capitals, sentence building, passages
for (const lv of Object.keys(HOMOPHONES)) {
  for (const [s, a] of HOMOPHONES[lv]) {
    if (!s.includes('___')) err('homophones', `no gap in: ${s}`);
    if (!SOUND_ALIKE_MEANS[a.toLowerCase()]) err('homophones', `SOUND_ALIKE_MEANS has no entry for “${a}”`);
  }
}
for (const lv of Object.keys(ABC)) {
  for (const seq of ABC[lv]) if ([...seq].sort().join() !== seq.join()) err('abc', `not in ABC order: ${seq.join(', ')}`);
}
for (const lv of Object.keys(CAPITALS)) {
  for (const row of CAPITALS[lv]) {
    const words = row.s.split(' ').map(bare);
    const up = row.up.split(' ');
    if (row.s !== row.s.toLowerCase()) err('capitals', `should be all small letters: ${row.s}`);
    if (bare(up[0]) !== words[0]) err('capitals', `the first word must be in the list: ${row.s}`);
    for (const u of up) {
      if (u[0] !== u[0].toUpperCase()) err('capitals', `“${u}” should be written with its capital`);
      if (words.filter((w) => w === bare(u)).length !== 1) err('capitals', `“${u}” should appear exactly once in: ${row.s}`);
    }
  }
}
for (const lv of Object.keys(ORDER)) {
  for (const seq of ORDER[lv]) {
    if (seq[0][0] !== seq[0][0].toUpperCase()) err('order', `must start with a capital: ${seq.join(' ')}`);
    if (!/[.?!]$/.test(seq[seq.length - 1])) err('order', `must end with an end mark: ${seq.join(' ')}`);
    if (seq.slice(0, -1).some((w) => /[.?!]$/.test(w))) err('order', `only the last word may carry an end mark: ${seq.join(' ')}`);
  }
}
for (const p of PASSAGES) {
  const n = p.text.split(/\s+/).length;
  if (n > 60) err(p.id, `the passage is ${n} words; 60 is the most that fits beside the battle`);
  if (p.qs.length < 3) err(p.id, 'needs at least three questions');
  if (dict) for (const w of wordsIn(p.text)) if (!known(w) && !/^[A-Z]+$/.test(w)) warn(p.id, `“${w}” is not in the dictionary`);
}
for (const item of TRAINING) if (item.options.filter((o) => o.ok).length !== 1) err('training', 'each training item needs one right answer');
if (MISSIONS.length !== SECTORS.reduce((n, s) => n + s.skills.length + 1, 0)) err('missions', 'the mission list does not match the sectors');

// ---- report
if (args.includes('--list')) {
  for (const skill of Object.values(SKILLS)) {
    console.log(`\n== ${skill.id}: ${skill.name}`);
    for (const item of skill.items) {
      const q = [item.prompt.ask, item.prompt.big, item.prompt.text].filter(Boolean).join(' / ').replace(/\n/g, ' ');
      const a = item.options ? item.options.map((o) => (o.ok ? `[${o.label}]` : o.label)).join(' | ') : item.tokens ? item.tokens.map((t) => (t.ok ? `[${t.label}]` : t.label)).join(' ') : item.seq.join(' > ');
      console.log(`  ${item.lv} ${q}  →  ${a}`);
    }
  }
}
for (const w of warnings) console.log('  note   ' + w);
for (const e of errors) console.log('  ERROR  ' + e);
console.log(`\n${count} items in ${Object.keys(SKILLS).length} skills, ${MISSIONS.length} missions · ${errors.length} error(s), ${warnings.length} note(s)`);
process.exit(errors.length ? 1 : 0);
