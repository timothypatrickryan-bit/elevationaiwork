// Saved progress and every rule about progress: stars, sparks, unlocking,
// streaks, the word jar and badges. Everything lives in one object that is
// written to this device only (localStorage). Nothing is sent anywhere.

import { BOOKS, CHAPTERS, UNLOCK_AT, WORDS, TOTAL_LANTERNS, findChapter } from './content/index.js';
import { wordCount } from './text.js';

const KEY = 'lantern-library.save.v1';
const DAY = 24 * 60 * 60 * 1000;

function fresh() {
  return {
    v: 1,
    profile: { name: '', created: Date.now(), welcomed: false },
    settings: { sound: true, voice: true, size: 1, tint: 'paper', unlockAll: false },
    glim: { glow: 'gold', wear: [] },
    owned: ['gold'],
    sparks: 0,
    earned: 0,
    chapters: {}, // id -> { stars, points, plays, first, last, readSecs }
    skills: {}, // id -> { n, first, second }   (first attempts at a chapter only)
    words: {}, // word -> { box, due, seen, right, got }
    badges: {}, // id -> time earned
    counters: { evidenceFirst: 0, careful: 0, brighter: 0, perfect: 0, practice: 0 },
    streak: { day: '', count: 0, best: 0 },
    days: {}, // 'YYYY-MM-DD' -> { secs, chapters, words }
    log: [], // newest first
    session: null, // a chapter that was left half-finished
    lastBook: '',
  };
}

let state = fresh();
let storageWorks = true;

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = merge(fresh(), JSON.parse(raw));
  } catch (e) {
    storageWorks = false;
  }
  return state;
}

// Keeps the shape of `base` and copies over whatever `saved` has, so a save
// from an older version still loads after new fields are added.
function merge(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  for (const key of Object.keys(base)) {
    const b = base[key];
    const s = saved[key];
    if (s === undefined || s === null) continue;
    if (b && typeof b === 'object' && !Array.isArray(b) && Object.keys(b).length && typeof s === 'object' && !Array.isArray(s)) {
      base[key] = merge(b, s);
    } else if (typeof b === typeof s || b === null || (Array.isArray(b) && Array.isArray(s))) {
      base[key] = s;
    }
  }
  return base;
}

export function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    storageWorks = false;
  }
}

export const S = () => state;
export const canSave = () => storageWorks;

export function change(fn) {
  fn(state);
  save();
}

// ------------------------------------------------------------------ dates ----

export function dayKey(time = Date.now()) {
  const d = new Date(time);
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function addActivity(patch) {
  const key = dayKey();
  const day = state.days[key] || { secs: 0, chapters: 0, words: 0 };
  day.secs += patch.secs || 0;
  day.chapters += patch.chapters || 0;
  day.words += patch.words || 0;
  state.days[key] = day;
  const keys = Object.keys(state.days).sort();
  while (keys.length > 90) delete state.days[keys.shift()];
}

function touchStreak() {
  const today = dayKey();
  const st = state.streak;
  if (st.day === today) return;
  st.count = st.day === dayKey(Date.now() - DAY) ? st.count + 1 : 1;
  st.day = today;
  st.best = Math.max(st.best, st.count);
}

// The streak as it should be shown right now (0 once a day has been missed).
export function streakNow() {
  const st = state.streak;
  if (st.day === dayKey() || st.day === dayKey(Date.now() - DAY)) return st.count;
  return 0;
}

export const readToday = () => state.streak.day === dayKey();

// --------------------------------------------------------------- progress ----

export const starsOf = (chapterId) => (state.chapters[chapterId] ? state.chapters[chapterId].stars : 0);
export const isDone = (chapterId) => starsOf(chapterId) > 0;
export const lanternsLit = () => CHAPTERS.filter((c) => isDone(c.chapter.id)).length;
export const totalStars = () => CHAPTERS.reduce((n, c) => n + starsOf(c.chapter.id), 0);

export function bookUnlocked(bookIndex) {
  return state.settings.unlockAll || lanternsLit() >= UNLOCK_AT[bookIndex];
}

export function lanternsNeeded(bookIndex) {
  return Math.max(0, UNLOCK_AT[bookIndex] - lanternsLit());
}

// Stories are read in order; articles, tales and poems can be read in any order.
export function chapterUnlocked(bookIndex, index) {
  if (!bookUnlocked(bookIndex)) return false;
  if (state.settings.unlockAll || index === 0) return true;
  const book = BOOKS[bookIndex];
  if (book.kind !== 'fiction') return true;
  return isDone(book.chapters[index - 1].id);
}

export function bookProgress(book) {
  const lit = book.chapters.filter((c) => isDone(c.id)).length;
  const stars = book.chapters.reduce((n, c) => n + starsOf(c.id), 0);
  return { lit, total: book.chapters.length, stars, maxStars: book.chapters.length * 3, complete: lit === book.chapters.length };
}

// The chapter to suggest next: keep going in the book she last opened,
// otherwise the first unread chapter that is open.
export function nextUp() {
  const open = CHAPTERS.filter((c) => !isDone(c.chapter.id) && chapterUnlocked(c.bookIndex, c.index));
  if (!open.length) return null;
  return open.find((c) => c.book.id === state.lastBook) || open[0];
}

const RANKS = [
  [0, 'New Spark'],
  [3, 'Candle Keeper'],
  [9, 'Lamp Lighter'],
  [18, 'Lantern Bearer'],
  [30, 'Torch Carrier'],
  [44, 'Beacon Keeper'],
  [58, 'Lighthouse Guardian'],
  [70, 'Star of the Library'],
];

export function rank() {
  const stars = totalStars();
  let i = 0;
  while (i + 1 < RANKS.length && stars >= RANKS[i + 1][0]) i++;
  const next = RANKS[i + 1] || null;
  return { title: RANKS[i][1], at: RANKS[i][0], stars, next: next ? { title: next[1], at: next[0] } : null };
}

// ---------------------------------------------------------------- scoring ----

export const POINTS = { first: 2, second: 1, missed: 0 };

export function starsFor(points, max) {
  const share = max ? points / max : 0;
  if (share >= 0.85) return 3;
  if (share >= 0.6) return 2;
  return 1;
}

// A comfortable careful-reading time for a passage, in seconds.
export const carefulSeconds = (chapter) => Math.round((wordCount(chapter.text) / 280) * 60);

// Called when the last question of a chapter is answered. `session` is the
// reader's record: { chapterId, results: ['first' | 'second' | 'missed'], readSecs, totalSecs, replay }.
export function finishChapter(session) {
  const found = findChapter(session.chapterId);
  const { chapter, book } = found;
  const before = state.chapters[chapter.id];
  const firstTime = !before;
  const results = session.results;
  const points = results.reduce((n, r) => n + POINTS[r], 0);
  const max = results.length * POINTS.first;
  const stars = starsFor(points, max);
  const firstTry = results.filter((r) => r === 'first').length;
  const careful = firstTime && session.readSecs >= carefulSeconds(chapter);
  const improved = !firstTime && stars > before.stars;

  // Sparks: full value the first time through, half on a reread.
  const rate = firstTime ? 1 : 0.5;
  const lines = [];
  const fromAnswers = Math.round((firstTry * 10 + results.filter((r) => r === 'second').length * 5) * rate);
  if (fromAnswers) lines.push({ label: 'Answers', amount: fromAnswers });
  lines.push({ label: firstTime ? 'Lantern lit' : 'Read again', amount: firstTime ? 20 : 5 });
  if (stars === 3 && (firstTime || improved)) lines.push({ label: 'Three stars', amount: 20 });
  else if (stars === 2 && (firstTime || improved)) lines.push({ label: 'Two stars', amount: 10 });
  if (careful) lines.push({ label: 'Careful reader', amount: 5 });
  const sparks = lines.reduce((n, l) => n + l.amount, 0);

  const beforeBadges = Object.keys(state.badges);
  const newWords = [];

  state.chapters[chapter.id] = {
    stars: Math.max(stars, before ? before.stars : 0),
    points: Math.max(points, before ? before.points : 0),
    plays: (before ? before.plays : 0) + 1,
    first: before ? before.first : Date.now(),
    last: Date.now(),
    readSecs: before ? before.readSecs : session.readSecs,
  };
  state.sparks += sparks;
  state.earned += sparks;
  state.lastBook = book.id;
  state.session = null;

  if (firstTime) {
    chapter.questions.forEach((q, i) => {
      const sk = state.skills[q.skill] || { n: 0, first: 0, second: 0 };
      sk.n++;
      if (results[i] === 'first') sk.first++;
      if (results[i] === 'second') sk.second++;
      state.skills[q.skill] = sk;
      if (q.type === 'evidence' && results[i] === 'first') state.counters.evidenceFirst++;
    });
    if (careful) state.counters.careful++;
  }
  if (improved) state.counters.brighter++;
  if (firstTry === results.length) state.counters.perfect++;

  for (const w of chapter.words) if (collectWord(w.word, false)) newWords.push(w.word);

  const words = wordCount(chapter.text);
  const wpm = session.readSecs > 0 ? Math.round(words / (session.readSecs / 60)) : 0;
  state.log.unshift({
    t: Date.now(),
    id: chapter.id,
    stars,
    first: firstTry,
    n: results.length,
    secs: session.readSecs,
    wpm,
    replay: !firstTime,
    misses: chapter.questions.map((q, i) => (results[i] === 'first' ? null : q.skill)).filter(Boolean),
  });
  state.log.length = Math.min(state.log.length, 80);

  addActivity({ secs: session.totalSecs || session.readSecs, chapters: 1, words: newWords.length });
  touchStreak();
  checkBadges();
  save();

  const earnedBadges = Object.keys(state.badges).filter((id) => !beforeBadges.includes(id));
  return {
    chapter,
    book,
    stars,
    bestStars: state.chapters[chapter.id].stars,
    points,
    max,
    firstTry,
    total: results.length,
    firstTime,
    improved,
    careful,
    sparks,
    lines,
    newWords,
    badges: earnedBadges.map((id) => BADGES.find((b) => b.id === id)),
    bookComplete: bookProgress(book).complete,
  };
}

// ------------------------------------------------------------------ words ----
// A small Leitner system: each right answer moves a word up a box and pushes
// its next review further away; a miss sends it back to box 1.

const REVIEW_AFTER_DAYS = [0, 1, 2, 4, 8, 16];
export const TOP_BOX = REVIEW_AFTER_DAYS.length - 1;

export function collectWord(word, andSave = true) {
  const key = word.toLowerCase();
  if (!WORDS.has(key) || state.words[key]) return false;
  state.words[key] = { box: 0, due: Date.now(), seen: 0, right: 0, got: Date.now() };
  if (andSave) {
    addActivity({ words: 1 });
    checkBadges();
    save();
  }
  return true;
}

export const hasWord = (word) => !!state.words[word.toLowerCase()];

// 0 = just caught (dim), 1 = getting brighter, 2 = golden (known well).
export function glowOf(key) {
  const w = state.words[key];
  if (!w) return 0;
  if (w.box >= 4) return 2;
  return w.box >= 2 ? 1 : 0;
}

export function jarWords() {
  return Object.keys(state.words)
    .filter((k) => WORDS.has(k))
    .map((k) => ({ ...WORDS.get(k), ...state.words[k], glow: glowOf(k) }))
    .sort((a, b) => a.box - b.box || a.key.localeCompare(b.key));
}

export function dueWords() {
  const now = Date.now();
  return jarWords()
    .filter((w) => w.due <= now)
    .sort((a, b) => a.box - b.box || a.due - b.due);
}

// `early` = practiced before it was due. A right answer then counts as practice
// but does not move the word up, so the spacing between reviews stays honest.
export function gradeWord(key, correct, early = false) {
  const w = state.words[key];
  if (!w) return;
  w.seen++;
  if (correct) {
    w.right++;
    if (early) return;
    w.box = Math.min(TOP_BOX, w.box + 1);
  } else {
    w.box = Math.min(w.box, 1);
  }
  w.due = Date.now() + REVIEW_AFTER_DAYS[w.box] * DAY - (w.box ? 4 * 60 * 60 * 1000 : 0);
}

export function finishPractice({ right, total, secs }) {
  const sparks = right * 3 + (right === total ? 6 : 0);
  state.sparks += sparks;
  state.earned += sparks;
  state.counters.practice++;
  addActivity({ secs });
  touchStreak();
  const before = Object.keys(state.badges);
  checkBadges();
  save();
  return { sparks, badges: Object.keys(state.badges).filter((id) => !before.includes(id)).map((id) => BADGES.find((b) => b.id === id)) };
}

// ------------------------------------------------------------------- shop ----

export const SHOP = {
  glows: [
    { id: 'gold', name: 'Lantern Gold', cost: 0 },
    { id: 'ember', name: 'Ember', cost: 80 },
    { id: 'mint', name: 'Mint', cost: 80 },
    { id: 'sky', name: 'Sky', cost: 80 },
    { id: 'violet', name: 'Twilight', cost: 120 },
    { id: 'rose', name: 'Rose', cost: 120 },
  ],
  wear: [
    { id: 'glasses', name: 'Reading Glasses', cost: 50, slot: 'face' },
    { id: 'bow', name: 'Bow', cost: 50, slot: 'head' },
    { id: 'flower', name: 'Flower', cost: 50, slot: 'head' },
    { id: 'scarf', name: 'Cozy Scarf', cost: 90, slot: 'body' },
    { id: 'book', name: 'Tiny Book', cost: 90, slot: 'body' },
    { id: 'headphones', name: 'Headphones', cost: 140, slot: 'head' },
    { id: 'explorer', name: 'Explorer Hat', cost: 140, slot: 'head' },
    { id: 'wizard', name: 'Wizard Hat', cost: 200, slot: 'head' },
    { id: 'crown', name: 'Crown', cost: 320, slot: 'head' },
  ],
};

export const owns = (id) => state.owned.includes(id);

export function buy(item) {
  if (owns(item.id) || state.sparks < item.cost) return false;
  state.sparks -= item.cost;
  state.owned.push(item.id);
  return true;
}

export function setGlow(id) {
  if (owns(id)) state.glim.glow = id;
}

// Wearing something takes off whatever else was in the same slot.
export function toggleWear(item) {
  if (!owns(item.id)) return;
  const wearing = state.glim.wear.includes(item.id);
  const sameSlot = SHOP.wear.filter((w) => w.slot === item.slot).map((w) => w.id);
  state.glim.wear = state.glim.wear.filter((id) => !sameSlot.includes(id));
  if (!wearing) state.glim.wear.push(item.id);
}

// ----------------------------------------------------------------- badges ----

export const BADGES = [
  { id: 'first-light', name: 'First Light', art: 'flame', how: 'Light your first lantern.', test: (d) => d.lit >= 1 },
  { id: 'full-glow', name: 'Full Glow', art: 'star', how: 'Earn 3 stars on a chapter.', test: (d) => d.threeStar >= 1 },
  { id: 'clean-sweep', name: 'Clean Sweep', art: 'bolt', how: 'Get every question in a chapter right on the first try.', test: (d) => d.c.perfect >= 1 },
  { id: 'proof', name: 'Proof Positive', art: 'eye', how: 'Tap the right evidence on the first try 5 times.', test: (d) => d.c.evidenceFirst >= 5 },
  { id: 'careful', name: 'Careful Reader', art: 'book', how: 'Take your time reading 5 chapters.', test: (d) => d.c.careful >= 5 },
  { id: 'brighter', name: 'Brighter Second Time', art: 'spark', how: 'Reread a chapter and earn more stars than before.', test: (d) => d.c.brighter >= 1 },
  { id: 'cover', name: 'Cover to Cover', art: 'book', how: 'Finish every chapter in one book.', test: (d) => d.booksDone >= 1 },
  { id: 'explorer', name: 'Shelf Explorer', art: 'compass', how: 'Read a chapter from 4 different books.', test: (d) => d.booksTouched >= 4 },
  { id: 'catcher', name: 'Firefly Catcher', art: 'jar', how: 'Collect 20 words in your jar.', test: (d) => d.words >= 20 },
  { id: 'golden', name: 'Golden Glow', art: 'jar', how: 'Make 10 words glow gold.', test: (d) => d.golden >= 10 },
  { id: 'streak-3', name: 'Three Nights Running', art: 'moon', how: 'Read 3 days in a row.', test: (d) => d.streak >= 3 },
  { id: 'streak-7', name: 'A Week of Light', art: 'moon', how: 'Read 7 days in a row.', test: (d) => d.streak >= 7 },
  { id: 'dressed', name: 'Dressed to Glow', art: 'heart', how: 'Give Glim something to wear.', test: (d) => d.wearing >= 1 },
  { id: 'half', name: 'Halfway Bright', art: 'flame', how: `Light ${Math.ceil(TOTAL_LANTERNS / 2)} lanterns.`, test: (d) => d.lit >= Math.ceil(TOTAL_LANTERNS / 2) },
  { id: 'keeper', name: 'Keeper of the Library', art: 'key', how: 'Light every lantern.', test: (d) => d.lit >= TOTAL_LANTERNS },
  { id: 'every-star', name: 'Every Star', art: 'crown', how: 'Earn 3 stars on every chapter.', test: (d) => d.threeStar >= TOTAL_LANTERNS },
];

export function checkBadges() {
  const keys = Object.keys(state.words);
  const d = {
    lit: lanternsLit(),
    threeStar: CHAPTERS.filter((c) => starsOf(c.chapter.id) === 3).length,
    booksDone: BOOKS.filter((b) => bookProgress(b).complete).length,
    booksTouched: BOOKS.filter((b) => bookProgress(b).lit > 0).length,
    words: keys.length,
    golden: keys.filter((k) => glowOf(k) === 2).length,
    streak: state.streak.best,
    wearing: state.glim.wear.length,
    c: state.counters,
  };
  const earned = [];
  for (const b of BADGES) {
    if (!state.badges[b.id] && b.test(d)) {
      state.badges[b.id] = Date.now();
      earned.push(b);
    }
  }
  return earned;
}

// ---------------------------------------------------------- backup / reset ----

export function exportCode() {
  const json = JSON.stringify(state);
  return 'LL1.' + window.btoa(unescape(encodeURIComponent(json)));
}

export function importCode(code) {
  try {
    const text = String(code).trim();
    if (!text.startsWith('LL1.')) return false;
    const data = JSON.parse(decodeURIComponent(escape(window.atob(text.slice(4)))));
    if (!data || data.v !== 1 || typeof data.chapters !== 'object') return false;
    state = merge(fresh(), data);
    save();
    return true;
  } catch (e) {
    return false;
  }
}

export function resetAll() {
  state = fresh();
  save();
}
