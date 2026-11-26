#!/usr/bin/env node
// Checks the story files in js/content for mistakes the game cannot recover
// from (a missing answer, an evidence quote that is not in the passage, ...).
//
//   node tools/validate-content.mjs                 check every book
//   node tools/validate-content.mjs js/content/book-keeper.js
//   node tools/validate-content.mjs --units ...     also print how each passage is cut into sentences
//
// Exit code 1 if there are errors. Warnings are things to look at, not failures.

import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { blockOf, passageUnits, unitsMatching, plain, wordCount } from '../js/text.js';
import { SKILL_IDS } from '../js/content/skills.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const showUnits = args.includes('--units');
const files = args.filter((a) => !a.startsWith('--'));
const targets = files.length
  ? files.map((f) => resolve(process.cwd(), f))
  : readdirSync(join(root, 'js/content'))
      .filter((f) => /^book-.*\.js$/.test(f))
      .sort()
      .map((f) => join(root, 'js/content', f));

const HUES = ['gold', 'teal', 'violet', 'coral', 'mint', 'sky'];
const KINDS = ['fiction', 'nonfiction', 'traditional'];
const POS = ['noun', 'verb', 'adjective', 'adverb'];
const TYPES = ['mc', 'multi', 'evidence', 'order', 'sort', 'cloze'];
const EVIDENCE_OPTIONAL = ['main', 'theme', 'purpose', 'structure', 'sequence'];
const WORD_RANGE = { 1: [250, 380], 2: [300, 440], 3: [360, 500] };

let errors = 0;
let warnings = 0;
const seenChapterIds = new Map();
const seenWords = new Map();

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

function readingGrade(blocks, units) {
  const words = blocks
    .map((b) => plain(blockOf(b).text))
    .join(' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z]/.test(w));
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  const sentences = Math.max(1, units.length);
  return 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59;
}

function isText(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function distinct(list) {
  return new Set(list.map((s) => String(s).trim().toLowerCase())).size === list.length;
}

for (const file of targets) {
  let book;
  try {
    book = (await import(pathToFileURL(file).href)).default;
  } catch (e) {
    console.log(`\n✖ ${file}\n  could not be loaded: ${e.message}`);
    errors++;
    continue;
  }
  const label = (where) => `[${book && book.id}${where ? ' › ' + where : ''}]`;
  const err = (where, msg) => {
    errors++;
    console.log(`  ✖ ${label(where)} ${msg}`);
  };
  const warn = (where, msg) => {
    warnings++;
    console.log(`  ! ${label(where)} ${msg}`);
  };

  console.log(`\n${file.replace(root + '/', '')}`);
  if (!book || typeof book !== 'object') {
    err('', 'the file must `export default` a book object');
    continue;
  }
  for (const key of ['id', 'title', 'genre', 'blurb', 'cover']) {
    if (!isText(book[key])) err('', `missing "${key}"`);
  }
  if (!KINDS.includes(book.kind)) err('', `"kind" must be one of ${KINDS.join(', ')}`);
  if (![1, 2, 3].includes(book.level)) err('', '"level" must be 1, 2 or 3');
  if (!HUES.includes(book.hue)) err('', `"hue" must be one of ${HUES.join(', ')}`);
  if (!Array.isArray(book.chapters) || !book.chapters.length) {
    err('', 'no chapters');
    continue;
  }
  if (book.chapters.length !== 4) warn('', `has ${book.chapters.length} chapters (books normally have 4)`);

  for (const ch of book.chapters) {
    const at = ch.id || ch.title || '?';
    if (!isText(ch.id) || !ch.id.startsWith(book.id + '-')) err(at, `chapter id must start with "${book.id}-"`);
    if (seenChapterIds.has(ch.id)) err(at, `duplicate chapter id (also in ${seenChapterIds.get(ch.id)})`);
    seenChapterIds.set(ch.id, book.id);
    for (const key of ['title', 'teaser', 'talk']) if (!isText(ch[key])) err(at, `missing "${key}"`);
    if (!Array.isArray(ch.text) || !ch.text.length) {
      err(at, 'missing "text"');
      continue;
    }

    // ---- passage ----
    const isPoem = ch.format === 'poem';
    let blocksOk = true;
    ch.text.forEach((block, i) => {
      const okShape = typeof block === 'string' || (block && isText(block.text));
      if (!okShape) {
        blocksOk = false;
        return err(at, `text[${i}] must be a string or { as, text }`);
      }
      const b = blockOf(block);
      if (!['p', 'note', 'verse', 'heading'].includes(b.as)) err(at, `text[${i}] has unknown "as: ${b.as}"`);
      if (/["']/.test(b.text)) warn(at, `text[${i}] uses straight quotes; use curly “ ” ‘ ’: ${b.text.slice(0, 50)}…`);
      if (/ {2,}/.test(b.text)) warn(at, `text[${i}] has a double space`);
    });
    if (!blocksOk) continue;
    const units = passageUnits(ch.text);
    for (const u of units) {
      if ((u.text.match(/\*/g) || []).length % 2) err(at, `italics (*…*) must open and close inside one sentence: “${u.text}”`);
      const b = blockOf(ch.text[u.block]);
      if (b.as !== 'verse') {
        if (/^[a-z]/.test(plain(u.text))) warn(at, `sentence starts with a lowercase letter (bad split?): “${u.text}”`);
        if (plain(u.text).split(/\s+/).length < 3) warn(at, `very short sentence (check the split): “${u.text}”`);
      }
    }
    const count = wordCount(ch.text);
    const grade = readingGrade(ch.text, units);
    if (!isPoem) {
      const [lo, hi] = WORD_RANGE[book.level] || WORD_RANGE[2];
      if (count < lo || count > hi) warn(at, `${count} words (level ${book.level} aims for ${lo}–${hi})`);
      if (grade > 8.5) warn(at, `reading grade ≈ ${grade.toFixed(1)}: shorten sentences or simplify words`);
      if (grade < 3) warn(at, `reading grade ≈ ${grade.toFixed(1)}: this may be too easy`);
    }

    const resolveSnippet = (snippet, what) => {
      if (!isText(snippet)) return err(at, `${what}: empty quote`);
      const hits = unitsMatching(units, snippet);
      if (hits.length === 0) err(at, `${what}: not found in the passage: “${snippet}”`);
      else if (hits.length > 1) err(at, `${what}: matches ${hits.length} sentences, make it longer: “${snippet}”`);
    };

    // ---- power words ----
    const passagePlain = ch.text.map((b) => plain(blockOf(b).text)).join('\n');
    if (!Array.isArray(ch.words) || ch.words.length < 3 || ch.words.length > 5) err(at, 'needs 3–5 power words');
    for (const w of ch.words || []) {
      const wat = `${at} › word ${w.word}`;
      if (!isText(w.word) || !isText(w.def) || !isText(w.ex)) {
        err(wat, 'needs word, def and ex');
        continue;
      }
      if (!POS.includes(w.pos)) err(wat, `"pos" must be one of ${POS.join(', ')}`);
      const surface = w.in || w.word;
      if (!new RegExp('(^|[^A-Za-z])' + surface.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z]|$)').test(passagePlain)) {
        err(wat, `“${surface}” does not appear in the passage (set "in" to the exact form used)`);
      }
      const marked = w.ex.match(/\*([^*]+)\*/g) || [];
      if (marked.length !== 1 || marked[0].slice(1, -1).toLowerCase() !== w.word.toLowerCase()) {
        err(wat, `"ex" must contain the base word once, marked like *${w.word}*`);
      }
      if (w.def.split(/\s+/).length > 18) warn(wat, 'definition is long; aim for 16 words or fewer');
      if (new RegExp('\\b' + w.word + '\\b', 'i').test(w.def)) warn(wat, 'definition uses the word itself');
      const key = w.word.toLowerCase();
      if (seenWords.has(key)) warn(wat, `power word also used in ${seenWords.get(key)}`);
      seenWords.set(key, ch.id);
    }

    // ---- questions ----
    const qs = Array.isArray(ch.questions) ? ch.questions : [];
    if (qs.length !== 6) (qs.length < 5 || qs.length > 7 ? err : warn)(at, `has ${qs.length} questions (aim for 6)`);
    qs.forEach((q, i) => {
      const qat = `${at} › Q${i + 1}`;
      if (!TYPES.includes(q.type)) return err(qat, `unknown type "${q.type}"`);
      if (!SKILL_IDS.includes(q.skill)) err(qat, `unknown skill "${q.skill}"`);
      if (!isText(q.q)) err(qat, 'missing "q"');
      if (!isText(q.why)) err(qat, 'missing "why"');
      else if (q.why.split(/\s+/).length > 70) warn(qat, '"why" is long; keep it under about 60 words');
      if (q.evidence !== undefined) {
        if (!Array.isArray(q.evidence)) err(qat, '"evidence" must be a list of quotes');
        else q.evidence.forEach((s) => resolveSnippet(s, `${qat} evidence`));
      }
      const needsEvidence = (q.type === 'mc' || q.type === 'multi') && !EVIDENCE_OPTIONAL.includes(q.skill);
      if (needsEvidence && !(q.evidence && q.evidence.length)) warn(qat, 'add "evidence" quotes so the explanation can point at the text');

      if (q.type === 'mc') {
        if (!Array.isArray(q.choices) || q.choices.length !== 4) return err(qat, 'mc needs exactly 4 choices');
        if (!q.choices.every(isText) || !distinct(q.choices)) err(qat, 'choices must be different, non-empty strings');
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) return err(qat, '"answer" must be 0, 1, 2 or 3');
        const lens = q.choices.map((c) => plain(c).length);
        const others = lens.filter((_, j) => j !== q.answer);
        if (lens[q.answer] > 45 && lens[q.answer] > Math.max(...others) * 1.35) {
          warn(qat, 'the right answer is much longer than the others, which gives it away');
        }
      }
      if (q.type === 'multi') {
        if (!Array.isArray(q.choices) || q.choices.length < 4 || q.choices.length > 6) return err(qat, 'multi needs 4–6 choices (5 is best)');
        if (!q.choices.every(isText) || !distinct(q.choices)) err(qat, 'choices must be different, non-empty strings');
        const a = q.answers;
        if (!Array.isArray(a) || a.length < 2 || a.length > 3 || new Set(a).size !== a.length || !a.every((n) => Number.isInteger(n) && n >= 0 && n < q.choices.length)) {
          return err(qat, '"answers" must list 2 or 3 different choice numbers');
        }
        const numberWord = { 2: 'TWO', 3: 'THREE' }[a.length];
        if (!q.q.includes(numberWord)) warn(qat, `the question should say how many to choose (“Choose ${numberWord} …”)`);
      }
      if (q.type === 'evidence') {
        if (!Array.isArray(q.answer) || q.answer.length < 1 || q.answer.length > 3) return err(qat, 'evidence needs "answer": 1–3 quotes');
        q.answer.forEach((s) => resolveSnippet(s, `${qat} answer`));
        if (!/^Tap the (sentence|line)/.test(q.q)) warn(qat, 'start the question with “Tap the sentence …” (or “Tap the line …” for poems)');
      }
      if (q.type === 'order') {
        if (!Array.isArray(q.items) || q.items.length < 4 || q.items.length > 5) return err(qat, 'order needs 4 or 5 items, written in the correct order');
        if (!q.items.every(isText) || !distinct(q.items)) err(qat, 'items must be different, non-empty strings');
      }
      if (q.type === 'sort') {
        if (!Array.isArray(q.bins) || q.bins.length < 2 || q.bins.length > 3 || !q.bins.every(isText)) return err(qat, 'sort needs 2 or 3 bins');
        if (!Array.isArray(q.items) || q.items.length < 4 || q.items.length > 6) return err(qat, 'sort needs 4–6 items');
        const used = new Set();
        for (const it of q.items) {
          if (!it || !isText(it.t) || !Number.isInteger(it.bin) || it.bin < 0 || it.bin >= q.bins.length) {
            err(qat, 'each sort item needs { t: "text", bin: number }');
          } else used.add(it.bin);
        }
        if (used.size < q.bins.length) warn(qat, 'one bin has no items');
      }
      if (q.type === 'cloze') {
        if (!isText(q.text) || !Array.isArray(q.blanks) || !Array.isArray(q.extra)) return err(qat, 'cloze needs text, blanks and extra');
        const holes = q.text.match(/\[(\d)\]/g) || [];
        const expected = q.blanks.map((_, n) => `[${n + 1}]`);
        if (holes.join() !== expected.join()) err(qat, `cloze text must contain ${expected.join(' ')} in order, once each`);
        if (q.blanks.length < 2 || q.blanks.length > 4) err(qat, 'cloze needs 2–4 blanks');
        if (q.extra.length < 2 || q.extra.length > 3) err(qat, 'cloze needs 2 or 3 extra (wrong) words');
        if (!distinct([...q.blanks, ...q.extra])) err(qat, 'cloze words must all be different');
      }
    });
    const nonMc = qs.filter((q) => q.type !== 'mc').length;
    const skills = new Set(qs.map((q) => q.skill)).size;
    if (nonMc < 2) warn(at, 'only ' + nonMc + ' question(s) that are not multiple choice; aim for at least 2');
    if (skills < 4) warn(at, `only ${skills} different skills; aim for at least 4`);

    console.log(
      `  ✓ ${ch.id.padEnd(14)} ${String(count).padStart(3)} words · grade ≈ ${grade.toFixed(1)} · ${units.length} sentences · ` +
        `${qs.map((q) => q.type).join(' ')} · ${[...new Set(qs.map((q) => q.skill))].join(' ')}`
    );
    if (showUnits) for (const u of units) console.log(`       ${u.id.padEnd(6)} ${u.text}`);
  }
}

console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
