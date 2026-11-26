// Saved progress and every rule about progress: which words she knows, when
// they come back for review, jars, sparks, unlocking and badges. Everything
// lives in one object written to this device only. Nothing is sent anywhere.

import { SHELVES, UNITS, WORDS, TOTAL_UNITS, findUnit, wordsOf } from './content/index.js';

const KEY = 'spellery.save.v1';
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function fresh() {
  return {
    v: 1,
    profile: { name: '', pet: 'Fizz', created: Date.now(), welcomed: false },
    // speak: null until the sound check has been done, then true or false
    settings: { sound: true, speak: null, unlockAll: false },
    start: 0, // the shelf the placement check chose
    look: { color: 'pink', wear: [] },
    owned: ['pink'],
    sparks: 0,
    earned: 0,
    units: {}, // id -> { stars, via, plays, checked, last }
    words: {}, // word -> { box, due, seen, first, miss, bad: [], last }
    badges: {},
    counters: { fixed: 0, clean: 0, checks: 0, reviews: 0, proofs: 0 },
    streak: { day: '', count: 0, best: 0 },
    days: {}, // 'YYYY-MM-DD' -> { secs, words, right }
    log: [], // newest first
  };
}

let state = fresh();
let storageWorks = true;

function merge(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  for (const key of Object.keys(base)) {
    const b = base[key];
    const s = saved[key];
    if (s === undefined) continue;
    if (b && typeof b === 'object' && !Array.isArray(b) && Object.keys(b).length && s && typeof s === 'object' && !Array.isArray(s)) base[key] = merge(b, s);
    else if (b === null || s === null || typeof b === typeof s) base[key] = s;
  }
  return base;
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = merge(fresh(), JSON.parse(raw));
  } catch (e) {
    storageWorks = false;
  }
  return state;
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
  const day = state.days[key] || { secs: 0, words: 0, right: 0 };
  day.secs += patch.secs || 0;
  day.words += patch.words || 0;
  day.right += patch.right || 0;
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

export function streakNow() {
  const st = state.streak;
  if (st.day === dayKey() || st.day === dayKey(Date.now() - DAY)) return st.count;
  return 0;
}

export const playedToday = () => state.streak.day === dayKey();

// ------------------------------------------------------------------ words ----
// Each word sits in a box from 0 to 5. Spelling it right first time moves it
// up a box and pushes its next review further away; missing it sends it back
// to the start. A word counts as mastered from box 3.

const REVIEW_AFTER_DAYS = [0, 1, 3, 7, 14, 30];
export const TOP_BOX = REVIEW_AFTER_DAYS.length - 1;
export const MASTERED_BOX = 3;

// A missed word comes back after ten minutes, so it turns up later in the same
// sitting or the next one. Other boxes wait whole days, less a few hours so a
// review still counts when she plays a little earlier than the day before.
const dueAfter = (box) => Date.now() + (box ? REVIEW_AFTER_DAYS[box] * DAY - 4 * HOUR : 10 * 60 * 1000);

// credit: 'first' (right first time), 'second' (right after a hint), 'missed'.
// attempts: what she typed, wrong tries included.
export function recordSpelling(word, credit, attempts = []) {
  const prev = state.words[word];
  const w = prev || { box: 0, due: 0, seen: 0, first: 0, miss: 0, bad: [], last: 0 };
  const now = Date.now();
  const fresh = !prev || prev.seen === 0; // her first real attempt at this word
  let tooSoon = false;
  w.seen++;
  w.last = now;
  if (credit === 'first') {
    w.first++;
    // A word she gets right the first time she ever meets it is one she knows.
    if (fresh) w.box = 2;
    // Otherwise a word only moves up when its review has come due, so playing a
    // jar twice in a row cannot make words look mastered. A missed word is the
    // exception: getting it right at all is progress.
    else if (w.box === 0 || now >= w.due) w.box = Math.min(TOP_BOX, w.box + 1);
    else tooSoon = true;
  } else if (credit === 'second') {
    w.box = Math.max(1, w.box - 1);
  } else {
    w.miss++;
    w.box = 0;
  }
  if (credit !== 'first') {
    for (const typed of attempts) {
      if (typed && typed !== word && !w.bad.includes(typed)) w.bad.unshift(typed);
    }
    w.bad.length = Math.min(w.bad.length, 4);
  }
  if (!tooSoon) w.due = dueAfter(w.box);
  state.words[word] = w;
  save();
  return w;
}

// Words of a unit she has not been asked yet go on the review list, so
// passing a quick check never lets a word slip by untested.
function queueUntested(unit) {
  for (const word of wordsOf(unit)) {
    if (!state.words[word.key]) state.words[word.key] = { box: 1, due: dueAfter(1), seen: 0, first: 0, miss: 0, bad: [], last: 0 };
  }
}

// 0 = not met yet, 1 = learning, 2 = getting stronger, 3 = mastered
export function glowOf(word) {
  const w = state.words[word];
  if (!w || (!w.seen && w.box <= 1)) return 0;
  if (w.box >= MASTERED_BOX) return 3;
  return w.box >= 2 ? 2 : 1;
}

export const masteredCount = () => Object.keys(state.words).filter((k) => WORDS.has(k) && state.words[k].box >= MASTERED_BOX).length;
export const metCount = () => Object.keys(state.words).filter((k) => WORDS.has(k) && state.words[k].seen > 0).length;

export function dueWords() {
  const now = Date.now();
  return Object.keys(state.words)
    .filter((k) => WORDS.has(k) && state.words[k].due <= now)
    .sort((a, b) => state.words[a].box - state.words[b].box || state.words[a].due - state.words[b].due)
    .map((k) => WORDS.get(k));
}

// Words she has missed, most-missed first, with what she actually typed.
export function troubleWords() {
  return Object.keys(state.words)
    .filter((k) => WORDS.has(k) && state.words[k].miss > 0)
    .map((k) => ({ word: WORDS.get(k), ...state.words[k] }))
    .sort((a, b) => b.miss - a.miss || a.box - b.box);
}

// ------------------------------------------------------------------ units ----

export const starsOf = (unitId) => (state.units[unitId] ? state.units[unitId].stars || 0 : 0);
export const unitDone = (unitId) => starsOf(unitId) > 0;
export const wasChecked = (unitId) => !!(state.units[unitId] && state.units[unitId].checked);
export const jarsFilled = () => UNITS.filter((u) => unitDone(u.unit.id)).length;

export function shelfProgress(shelfIndex) {
  const units = SHELVES[shelfIndex].units;
  const done = units.filter((u) => unitDone(u.id)).length;
  const stars = units.reduce((n, u) => n + starsOf(u.id), 0);
  return { done, total: units.length, stars, complete: done === units.length };
}

export const JARS_TO_OPEN = 3;
const LONGEST_SITTING = 30 * 60; // seconds; an iPad left open must not count as hours of practice

// Shelves up to her starting shelf are open. After that, a shelf opens when
// three jars on the shelf before it are filled.
export function shelfOpen(shelfIndex) {
  if (state.settings.unlockAll || shelfIndex <= state.start) return true;
  // A shelf she has already worked on stays open, even if a grown-up later
  // moves her starting shelf back.
  if (shelfProgress(shelfIndex).done > 0) return true;
  return shelfOpen(shelfIndex - 1) && shelfProgress(shelfIndex - 1).done >= JARS_TO_OPEN;
}


// The jar to suggest next: the first unfilled one from her starting shelf on,
// then anything unfilled on the earlier shelves.
export function nextUnit() {
  const open = UNITS.filter((u) => !unitDone(u.unit.id) && shelfOpen(u.shelfIndex));
  return open.find((u) => u.shelfIndex >= state.start) || open[0] || null;
}

export function noteChecked(unitId) {
  const u = state.units[unitId] || { stars: 0, via: '', plays: 0, checked: false, last: 0 };
  u.checked = true;
  state.units[unitId] = u;
  save();
}

export function starsForCheck(right, total) {
  if (right >= total) return 3;
  return right >= total - 1 ? 2 : 0;
}

export function starsForLesson(firstTry, total) {
  const share = total ? firstTry / total : 0;
  if (share >= 0.8) return 3;
  return share >= 0.5 ? 2 : 1;
}

// Called when a jar is finished, either by passing the quick check or by
// working through the lesson. results = one credit per word spelled.
export function finishUnit({ unitId, via, results, secs: sat }) {
  const secs = Math.min(sat || 0, LONGEST_SITTING);
  const found = findUnit(unitId);
  const before = state.units[unitId] || { stars: 0, via: '', plays: 0, checked: false, last: 0 };
  const firstTime = !before.stars;
  const right = results.filter((r) => r === 'first').length;
  const fixed = results.filter((r) => r === 'second').length;
  const stars = via === 'check' ? starsForCheck(right, results.length) : starsForLesson(right, results.length);
  const improved = !firstTime && stars > before.stars;

  const lines = [];
  if (right) lines.push({ label: 'Right first time', amount: right * 5 });
  if (fixed) lines.push({ label: 'Fizzles fixed', amount: fixed * 2 });
  lines.push({ label: firstTime ? 'Jar filled' : 'Brewed again', amount: firstTime ? 15 : 5 });
  if (stars === 3 && (firstTime || improved)) lines.push({ label: 'Three stars', amount: 10 });
  const sparks = lines.reduce((n, l) => n + l.amount, 0);

  const openBefore = SHELVES.map((_, i) => shelfOpen(i));
  const badgesBefore = Object.keys(state.badges);

  state.units[unitId] = { stars: Math.max(stars, before.stars), via: before.stars ? before.via : via, plays: before.plays + 1, checked: true, last: Date.now() };
  queueUntested(found.unit);
  state.sparks += sparks;
  state.earned += sparks;
  state.counters.fixed += fixed;
  if (right === results.length && results.length >= 5) state.counters.clean++;
  if (via === 'check') state.counters.checks++;
  state.log.unshift({ t: Date.now(), kind: via, id: unitId, stars, right, fixed, n: results.length, secs });
  state.log.length = Math.min(state.log.length, 80);
  addActivity({ secs, words: results.length, right });
  touchStreak();
  checkBadges();
  save();

  return {
    unit: found.unit,
    shelf: found.shelf,
    stars,
    best: state.units[unitId].stars,
    right,
    fixed,
    total: results.length,
    firstTime,
    improved,
    sparks,
    lines,
    badges: Object.keys(state.badges).filter((id) => !badgesBefore.includes(id)).map((id) => BADGES.find((b) => b.id === id)),
    opened: SHELVES.filter((_, i) => !openBefore[i] && shelfOpen(i)),
  };
}

export function finishReview({ results, secs: sat, proofs = 0 }) {
  const secs = Math.min(sat || 0, LONGEST_SITTING);
  const right = results.filter((r) => r === 'first').length;
  const fixed = results.filter((r) => r === 'second').length;
  const lines = [];
  if (right) lines.push({ label: 'Right first time', amount: right * 5 });
  if (fixed) lines.push({ label: 'Fizzles fixed', amount: fixed * 2 });
  if (proofs) lines.push({ label: 'Fizzle spotted', amount: proofs * 5 });
  lines.push({ label: 'Review done', amount: 10 });
  const sparks = lines.reduce((n, l) => n + l.amount, 0);
  const badgesBefore = Object.keys(state.badges);
  state.sparks += sparks;
  state.earned += sparks;
  state.counters.fixed += fixed;
  state.counters.reviews++;
  state.counters.proofs += proofs;
  state.log.unshift({ t: Date.now(), kind: 'review', id: '', stars: 0, right, fixed, n: results.length, secs });
  state.log.length = Math.min(state.log.length, 80);
  addActivity({ secs, words: results.length, right });
  touchStreak();
  checkBadges();
  save();
  return { right, fixed, total: results.length, sparks, lines, badges: Object.keys(state.badges).filter((id) => !badgesBefore.includes(id)).map((id) => BADGES.find((b) => b.id === id)) };
}

// The first-launch check: results[i] = how many of the two probe words for
// shelf i she spelled right (shelves she was not asked about are left out).
export function placeFrom(results) {
  let start = results.length >= 6 ? 6 : results.length;
  for (let i = 0; i < results.length; i++) {
    if (results[i] < 2) {
      start = i;
      break;
    }
  }
  state.start = Math.min(start, SHELVES.length - 1);
  save();
  return state.start;
}

const RANKS = [
  [0, 'New Apprentice'],
  [3, 'Jar Filler'],
  [8, 'Spell Mixer'],
  [14, 'Charm Maker'],
  [21, 'Master Brewer'],
  [28, 'Grand Speller'],
  [35, 'Keeper of the Spellery'],
];

export function rank() {
  const jars = jarsFilled();
  let i = 0;
  while (i + 1 < RANKS.length && jars >= RANKS[i + 1][0]) i++;
  const next = RANKS[i + 1] || null;
  return { title: RANKS[i][1], at: RANKS[i][0], jars, next: next ? { title: next[1], at: next[0] } : null };
}

// ------------------------------------------------------------------- shop ----

export const SHOP = {
  colors: [
    { id: 'pink', name: 'Bubblegum', cost: 0 },
    { id: 'mint', name: 'Mint', cost: 60 },
    { id: 'lilac', name: 'Lilac', cost: 60 },
    { id: 'sky', name: 'Sky', cost: 60 },
    { id: 'peach', name: 'Peach', cost: 90 },
    { id: 'gold', name: 'Golden', cost: 150 },
  ],
  wear: [
    { id: 'bow', name: 'Bow', cost: 40, slot: 'head' },
    { id: 'star', name: 'Star Clip', cost: 40, slot: 'head' },
    { id: 'bowtie', name: 'Bow Tie', cost: 50, slot: 'neck' },
    { id: 'glasses', name: 'Glasses', cost: 60, slot: 'face' },
    { id: 'scarf', name: 'Scarf', cost: 70, slot: 'neck' },
    { id: 'cap', name: 'Cap', cost: 90, slot: 'head' },
    { id: 'flowers', name: 'Flower Crown', cost: 120, slot: 'head' },
    { id: 'wizard', name: 'Wizard Hat', cost: 160, slot: 'head' },
    { id: 'crown', name: 'Crown', cost: 250, slot: 'head' },
  ],
};

export const owns = (id) => state.owned.includes(id);

export function buy(item) {
  if (owns(item.id) || state.sparks < item.cost) return false;
  state.sparks -= item.cost;
  state.owned.push(item.id);
  return true;
}

export function setColor(id) {
  if (owns(id)) state.look.color = id;
}

export function toggleWear(item) {
  if (!owns(item.id)) return;
  const wearing = state.look.wear.includes(item.id);
  const sameSlot = SHOP.wear.filter((w) => w.slot === item.slot).map((w) => w.id);
  state.look.wear = state.look.wear.filter((id) => !sameSlot.includes(id));
  if (!wearing) state.look.wear.push(item.id);
}

// ----------------------------------------------------------------- badges ----

export const BADGES = [
  { id: 'first-jar', name: 'First Jar', art: 'jar', how: 'Fill your first jar.', test: (d) => d.jars >= 1 },
  { id: 'no-fizzle', name: 'Not One Fizzle', art: 'wand', how: 'Finish a jar with every word right first time.', test: (d) => d.c.clean >= 1 },
  { id: 'fixer', name: 'Fizzle Fixer', art: 'bolt', how: 'Fix 10 fizzles on the second try.', test: (d) => d.c.fixed >= 10 },
  { id: 'knew-it', name: 'Knew It Already', art: 'eye', how: 'Pass a quick check.', test: (d) => d.c.checks >= 1 },
  { id: 'ten', name: 'Ten in the Book', art: 'book', how: 'Master 10 words.', test: (d) => d.mastered >= 10 },
  { id: 'fifty', name: 'Fifty in the Book', art: 'book', how: 'Master 50 words.', test: (d) => d.mastered >= 50 },
  { id: 'hundred', name: 'A Hundred Words', art: 'star', how: 'Master 100 words.', test: (d) => d.mastered >= 100 },
  { id: 'reviewer', name: 'Back for More', art: 'spark', how: 'Finish 5 reviews.', test: (d) => d.c.reviews >= 5 },
  { id: 'shelf', name: 'Full Shelf', art: 'jar', how: 'Fill every jar on one shelf.', test: (d) => d.shelves >= 1 },
  { id: 'streak-3', name: 'Three Days Running', art: 'flame', how: 'Practice 3 days in a row.', test: (d) => d.streak >= 3 },
  { id: 'streak-7', name: 'A Whole Week', art: 'flame', how: 'Practice 7 days in a row.', test: (d) => d.streak >= 7 },
  { id: 'dressed', name: 'Looking Sharp', art: 'heart', how: 'Give your familiar something to wear.', test: (d) => d.wearing >= 1 },
  { id: 'spotter', name: 'Sharp Eyes', art: 'eye', how: 'Spot 5 fizzles hiding in a sentence.', test: (d) => d.c.proofs >= 5 },
  { id: 'half', name: 'Halfway There', art: 'moon', how: `Fill ${Math.ceil(TOTAL_UNITS / 2)} jars.`, test: (d) => d.jars >= Math.ceil(TOTAL_UNITS / 2) },
  { id: 'keeper', name: 'Keeper of the Spellery', art: 'crown', how: 'Fill every jar.', test: (d) => d.jars >= TOTAL_UNITS },
];

export function checkBadges() {
  const d = {
    jars: jarsFilled(),
    mastered: masteredCount(),
    shelves: SHELVES.filter((_, i) => shelfProgress(i).complete).length,
    streak: state.streak.best,
    wearing: state.look.wear.length,
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
  return 'SP1.' + window.btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

export function importCode(code) {
  try {
    const text = String(code).trim();
    if (!text.startsWith('SP1.')) return false;
    const data = JSON.parse(decodeURIComponent(escape(window.atob(text.slice(4)))));
    if (!data || data.v !== 1 || typeof data.words !== 'object') return false;
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
