#!/usr/bin/env node
// Checks the word shelves in js/content for mistakes.
//
//   node tools/validate-content.mjs                      check every shelf
//   node tools/validate-content.mjs js/content/shelf-2.js
//   node tools/validate-content.mjs --dict words.txt     also spell-check against a word list
//   node tools/validate-content.mjs --list               also print every word
//
// --dict takes a plain text file with one correctly spelled word per line. With
// it, every target word must be in the list, every listed misspelling must NOT
// be, and unknown words in sentences are reported.
//
// Exit code 1 if there are errors. Warnings are things to look at, not failures.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseWord, compare } from '../js/words.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const showList = args.includes('--list');
const dictAt = args.indexOf('--dict');
const dictPath = dictAt >= 0 ? args[dictAt + 1] : '';
const files = args.filter((a, i) => !a.startsWith('--') && i !== dictAt + 1);
const targets = files.length
  ? files.map((f) => resolve(process.cwd(), f))
  : readdirSync(join(root, 'js/content'))
      .filter((f) => /^shelf-\d+\.js$/.test(f))
      .sort()
      .map((f) => join(root, 'js/content', f));

const dict = dictPath ? new Set(readFileSync(resolve(process.cwd(), dictPath), 'utf8').split(/\r?\n/).map((w) => w.trim().toLowerCase()).filter(Boolean)) : null;

const HUES = ['coral', 'amber', 'lime', 'teal', 'sky', 'violet', 'pink'];
// Misspellings that happen to be obscure dictionary words no child knows.
// Add to this list only after looking the word up.
const OBSCURE = new Set(['mutch', 'nife', 'rong', 'pensil', 'skool', 'stomack', 'anker', 'korus', 'pilow', 'cieling', 'turkies', 'stoped']);
let errors = 0;
let warnings = 0;
const seenUnits = new Map();
const seenWords = new Map();
const isText = (v) => typeof v === 'string' && v.trim().length > 0;

for (const file of targets) {
  let shelf;
  try {
    shelf = (await import(pathToFileURL(file).href)).default;
  } catch (e) {
    console.log(`\n✖ ${file}\n  could not be loaded: ${e.message}`);
    errors++;
    continue;
  }
  console.log(`\n${file.replace(root + '/', '')}`);
  const err = (where, msg) => {
    errors++;
    console.log(`  ✖ [${where}] ${msg}`);
  };
  const warn = (where, msg) => {
    warnings++;
    console.log(`  ! [${where}] ${msg}`);
  };
  if (!shelf || typeof shelf !== 'object') {
    err('file', 'must `export default` a shelf object');
    continue;
  }
  for (const key of ['id', 'name', 'about']) if (!isText(shelf[key])) err(shelf.id || 'shelf', `missing "${key}"`);
  if (!HUES.includes(shelf.hue)) err(shelf.id, `"hue" must be one of ${HUES.join(', ')}`);
  if (!Array.isArray(shelf.units) || shelf.units.length !== 5) {
    err(shelf.id, 'a shelf needs exactly 5 units');
    if (!Array.isArray(shelf.units)) continue;
  }

  for (const unit of shelf.units) {
    const at = unit.id || unit.name || '?';
    if (!isText(unit.id) || !/^[a-z0-9-]+$/.test(unit.id)) err(at, 'unit id must be lowercase letters, digits and hyphens');
    if (seenUnits.has(unit.id)) err(at, `duplicate unit id (also on shelf ${seenUnits.get(unit.id)})`);
    seenUnits.set(unit.id, shelf.id);
    if (!isText(unit.name)) err(at, 'missing "name"');
    else if (unit.name.length > 16) err(at, `name is ${unit.name.length} characters; 16 is the most a jar label holds`);
    if (!isText(unit.about)) err(at, 'missing "about"');
    if (!Array.isArray(unit.rule) || unit.rule.length < 1 || unit.rule.length > 3 || !unit.rule.every(isText)) err(at, '"rule" needs 1–3 sentences');
    else for (const line of unit.rule) if ((line.match(/\*/g) || []).length % 2) err(at, `unbalanced * in rule: ${line}`);
    if (unit.chant !== undefined && (!isText(unit.chant) || unit.chant.length > 60)) err(at, '"chant" must be a short line (60 characters or fewer)');
    if (!Array.isArray(unit.words) || unit.words.length !== 10) {
      err(at, `needs exactly 10 words (has ${Array.isArray(unit.words) ? unit.words.length : 0})`);
      if (!Array.isArray(unit.words)) continue;
    }

    const sort = unit.sort;
    if (sort !== undefined && sort.sets !== undefined) {
      // Sound-alike sets: each card is [sentence with *, the word that fits].
      if (!isText(sort.ask)) err(at, 'sort needs "ask"');
      const sets = sort.sets;
      if (!Array.isArray(sets) || !sets.length || !sets.every((g) => Array.isArray(g) && g.length >= 2 && g.length <= 4 && g.every(isText))) err(at, 'sort.sets must be a list of groups of 2–4 words');
      else if (!Array.isArray(sort.cards) || sort.cards.length < 6 || sort.cards.length > 12) err(at, 'a sort with "sets" needs 6–12 cards');
      else
        for (const card of sort.cards) {
          const [show, answer] = card;
          if (!isText(show) || (show.match(/\*/g) || []).length !== 1) err(at, `card needs a sentence with exactly one *: ${JSON.stringify(card)}`);
          else if (sets.filter((g) => g.includes(answer)).length !== 1) err(at, `card answer "${answer}" must be in exactly one set`);
        }
    } else if (sort !== undefined) {
      if (!isText(sort.ask)) err(at, 'sort needs "ask"');
      if (!Array.isArray(sort.bins) || sort.bins.length < 2 || sort.bins.length > 4 || !sort.bins.every(isText)) err(at, 'sort needs 2–4 bins');
      if (sort.cards !== undefined) {
        if (!Array.isArray(sort.cards) || sort.cards.length < 6 || sort.cards.length > 12) err(at, 'sort.cards needs 6–12 cards');
        else
          for (const card of sort.cards) {
            const [show, bin, word] = card;
            if (!isText(show) || !Number.isInteger(bin) || bin < 0 || bin >= sort.bins.length) err(at, `bad card ${JSON.stringify(card)}`);
            else if (show.includes('*')) {
              if ((show.match(/\*/g) || []).length !== 1) err(at, `card sentence needs exactly one *: ${show}`);
            } else if (!show.includes('_')) err(at, `card needs a _ blank or a * sentence: ${show}`);
            else if (!isText(word)) err(at, `card "${show}" needs the finished word as its third item`);
            else if (dict && !dict.has(word)) err(at, `card word "${word}" is not in the dictionary`);
          }
      }
    }

    const binsUsed = new Set();
    let withBin = 0;
    const listed = [];
    for (const entry of unit.words) {
      if (!entry || !isText(entry.w) || !isText(entry.s)) {
        err(at, `each word needs "w" and "s": ${JSON.stringify(entry)}`);
        continue;
      }
      const markup = entry.w;
      const wat = `${at} › ${markup}`;
      if (!/^[a-z'\[\]-]+$/.test(markup)) err(wat, 'word markup may use only lowercase letters, apostrophes, [ ] and -');
      const opens = (markup.match(/\[/g) || []).length;
      const closes = (markup.match(/\]/g) || []).length;
      if (opens !== closes || /\[[^\]]*\[/.test(markup)) err(wat, 'brackets are not balanced');
      const p = parseWord(markup);
      if (!p.groups.length) err(wat, 'mark the tricky part with [ ]');
      if (p.hard.every(Boolean) && p.w.length > 3) warn(wat, 'the whole word is marked tricky; mark only the hard part');
      if (seenWords.has(p.w)) err(wat, `"${p.w}" is already used in unit ${seenWords.get(p.w)}`);
      seenWords.set(p.w, unit.id);
      listed.push(p.syl.length > 1 ? p.syl.join('·') : p.w);
      if (dict && !p.w.includes("'") && !dict.has(p.w)) err(wat, `"${p.w}" is not in the dictionary`);

      // sentence
      const s = entry.s;
      if ((s.match(/\*/g) || []).length !== 1) err(wat, `sentence needs exactly one *: ${s}`);
      if (s.trim().startsWith('*')) err(wat, 'the sentence must not start with the word');
      if (!/[.!?]$/.test(s.trim())) err(wat, 'the sentence must end with . ! or ?');
      if (/["']/.test(s.replace(/\*/g, ''))) warn(wat, `use curly quotes and apostrophes in the sentence: ${s}`);
      const tokens = s.replace('*', ' ').split(/\s+/).filter(Boolean);
      if (tokens.length + 1 < 4 || tokens.length + 1 > 13) warn(wat, `sentence has ${tokens.length + 1} words; aim for 5–11`);
      const lowerTokens = tokens.map((t) => t.toLowerCase().replace(/[^a-z’']/g, '').replace(/’/g, "'"));
      if (lowerTokens.includes(p.w)) err(wat, 'the sentence uses the word a second time');
      if (dict) {
        tokens.forEach((raw, i) => {
          const bare = raw.replace(/[^A-Za-z’'-]/g, '');
          if (!bare || /[’'-]/.test(bare)) return;
          const isName = i > 0 && /^[A-Z]/.test(bare);
          if (!isName && !dict.has(bare.toLowerCase())) warn(wat, `check the spelling of "${bare}" in the sentence`);
        });
      }

      // misspelling
      if (entry.x !== undefined) {
        if (!isText(entry.x) || !/^[a-z']+$/.test(entry.x)) err(wat, '"x" must be lowercase letters');
        else if (entry.x === p.w) err(wat, '"x" is the correct spelling');
        else {
          if (compare(p.w, entry.x).distance > 3) warn(wat, `"${entry.x}" is far from the word; use a mistake a child would really make`);
          if (dict && dict.has(entry.x) && !OBSCURE.has(entry.x)) warn(wat, `"${entry.x}" is a real word; pick a misspelling that is not`);
        }
      }
      if (entry.tip !== undefined && (!isText(entry.tip) || entry.tip.length > 110)) err(wat, '"tip" must be one short line (110 characters or fewer)');
      if (entry.from !== undefined && !/^[a-z']+ \+ [a-z']+$/.test(entry.from)) err(wat, '"from" must look like "hop + ing"');
      if (entry.bin !== undefined) {
        if (!sort || !sort.bins) err(wat, 'has "bin" but the unit has no sort bins');
        else if (!Number.isInteger(entry.bin) || entry.bin < 0 || entry.bin >= sort.bins.length) err(wat, 'bin is out of range');
        else {
          binsUsed.add(entry.bin);
          withBin++;
        }
      }
    }
    if (sort && !sort.cards && unit.build !== 'join') {
      if (withBin < 6) err(at, `sort needs at least 6 words with a "bin" (has ${withBin}), or its own "cards"`);
      if (sort.bins && binsUsed.size < sort.bins.length) warn(at, 'one sort bin has no words');
    }
    if (unit.build !== undefined && !['fill', 'join'].includes(unit.build)) err(at, '"build" must be "fill" or "join"');
    if (unit.build === 'join' && !unit.words.every((e) => e && e.from)) err(at, 'a "join" unit needs "from" on every word');

    console.log(`  ✓ ${String(unit.id).padEnd(14)} ${String(unit.name).padEnd(17)} ${sort ? 'sort:' + (sort.sets ? sort.sets.map((g) => g.join('=')).join(' ') : sort.bins.join('/')) : 'no sort'}${unit.build === 'join' ? ' · join' : ''}`);
    if (showList) console.log(`       ${listed.join(', ')}`);
  }
}

console.log(`\n${seenWords.size} words in ${seenUnits.size} units · ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
