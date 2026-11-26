// Everything the game remembers, and the rules for progress: medals, unlocks,
// crystals, ranks, badges, how well each skill is going, and which missed
// items are due to come back. It is all kept on this device only.

import { SKILLS, SECTORS, MISSIONS, RANKS, missionById } from './content/index.js';
import { SHIP_LIST, UPGRADES, PAINT_LIST, BADGES, BASE } from './content/hangar.js';

const KEY = 'quillfire.save.v1';
const DAY = 24 * 60 * 60 * 1000;
export const MEDAL_AT = [0.5, 0.75, 0.9]; // share right first try for bronze, silver, gold
const MEDAL_PAY = [0, 20, 40, 80];
const COME_BACK = [1, 3, 7]; // days until a missed item returns, after each time it is got right

let store = typeof window !== 'undefined' ? window.localStorage : null;
let clock = () => Date.now();
let state = null;

// Tests hand in their own storage and clock.
export function setup({ storage, now } = {}) {
  if (storage !== undefined) store = storage;
  if (now) clock = now;
  state = null;
}

const fresh = () => ({
  v: 1,
  pilot: { name: '', created: clock(), trained: false },
  settings: { sfx: true, music: true, voice: true, relaxed: false, calm: false, unlockAll: false },
  ship: 'quill',
  paint: 'teal',
  owned: { ships: ['quill'], paints: ['teal'] },
  up: { shield: 0, scan: 0, chrono: 0, nova: 0 },
  crystals: 0,
  xp: 0,
  missions: {}, // id -> { medal 0-3, best 0-1, plays, last, fails (emergency warps in a row) }
  skills: {}, // id -> { seen, right, recent: [1,0,...], tier, last: [keys] }
  review: {}, // item key -> { box, due (day number), n }
  badges: {}, // id -> when
  counters: { right: 0, bosses: 0, perfect: 0, noHit: 0, patrols: 0, bestStreak: 0 },
  streak: { day: 0, count: 0, best: 0 },
  patrol: { day: 0 },
  days: {}, // day number -> { secs, right, total }
  told: {}, // story moments already shown
  log: [], // the latest misses, for the grown-ups page
});

function merge(base, saved) {
  for (const k of Object.keys(saved)) {
    if (saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], saved[k]);
    else base[k] = saved[k];
  }
  return base;
}

export function S() {
  if (state) return state;
  state = fresh();
  try {
    const raw = store && store.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && saved.v === 1) merge(state, saved);
    }
  } catch (e) {
    state = fresh();
  }
  return state;
}

export function save() {
  try {
    if (store) store.setItem(KEY, JSON.stringify(S()));
  } catch (e) {
    /* storage is full or switched off; the game carries on without saving */
  }
}

export function resetAll() {
  state = fresh();
  save();
}

// ---- days

export const dayNumber = (t = clock()) => {
  const d = new Date(t);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
};
export const dayOf = (n) => new Date(n * DAY).toISOString().slice(0, 10);

function touchDay() {
  const st = S();
  const today = dayNumber();
  if (!st.days[today]) st.days[today] = { secs: 0, right: 0, total: 0 };
  const days = Object.keys(st.days).map(Number).sort((a, b) => a - b);
  while (days.length > 60) delete st.days[days.shift()];
  return st.days[today];
}

export function addTime(secs) {
  touchDay().secs += Math.max(0, Math.min(secs, 30 * 60));
}

function markPlayed() {
  const st = S();
  const today = dayNumber();
  if (st.streak.day === today) return;
  st.streak.count = st.streak.day === today - 1 ? st.streak.count + 1 : 1;
  st.streak.day = today;
  st.streak.best = Math.max(st.streak.best, st.streak.count);
}

// ---- ranks

export function rankOf(xp = S().xp) {
  let at = 0;
  RANKS.forEach(([need], i) => {
    if (xp >= need) at = i;
  });
  const next = RANKS[at + 1];
  return { index: at, name: RANKS[at][1], from: RANKS[at][0], next: next ? next[0] : null, nextName: next ? next[1] : '' };
}

// ---- what is open

export const medalOf = (id) => (S().missions[id] ? S().missions[id].medal : 0);

export function missionOpen(id) {
  const st = S();
  if (st.settings.unlockAll) return true;
  const m = missionById(id);
  if (!m) return false;
  const sector = SECTORS[m.sector];
  if (m.slot === 0) return m.sector === 0 || medalOf('boss-' + SECTORS[m.sector - 1].boss.id) > 0;
  if (m.boss) return sector.skills.every((skill) => medalOf(skill) > 0);
  return medalOf(sector.skills[m.slot - 1]) > 0;
}
export const sectorOpen = (s) => missionOpen(SECTORS[s].skills[0]);

// The mission to offer next: the first open one without a medal.
export function nextMission() {
  return MISSIONS.find((m) => missionOpen(m.id) && medalOf(m.id) === 0) || null;
}

// ---- the ship as flown: base numbers plus upgrades and the ship's own perk

export function loadout() {
  const st = S();
  const ship = SHIP_LIST.find((s) => s.id === st.ship) || SHIP_LIST[0];
  return {
    ship: st.ship,
    paint: st.paint,
    shield: BASE.shield + st.up.shield + (ship.shield || 0),
    scans: BASE.scans + st.up.scan,
    novaNeed: Math.max(3, BASE.novaNeed - st.up.nova - (ship.nova || 0)),
    think: 1 + 0.15 * st.up.chrono,
    gems: ship.gems || 0,
    slide: ship.slide || 1,
    relaxed: !!st.settings.relaxed,
    calm: !!st.settings.calm,
  };
}

// ---- how each skill is going

function skillState(id) {
  const st = S();
  if (!st.skills[id]) st.skills[id] = { seen: 0, right: 0, recent: [], tier: 1, last: [] };
  return st.skills[id];
}
export const tierOf = (id) => (S().skills[id] ? S().skills[id].tier : 1);

// One answer. `ok` means right on the first try with no help from a miss.
export function recordAnswer(skill, key, ok, detail) {
  const st = S();
  const sk = skillState(skill);
  sk.seen++;
  if (ok) sk.right++;
  sk.recent.push(ok ? 1 : 0);
  if (sk.recent.length > 12) sk.recent.shift();
  sk.last = sk.last.filter((k) => k !== key);
  sk.last.push(key);
  if (sk.last.length > 40) sk.last.shift();
  const day = touchDay();
  day.total++;
  if (ok) {
    day.right++;
    st.counters.right++;
  }
  const today = dayNumber();
  const card = st.review[key];
  if (!ok) {
    st.review[key] = { box: 0, due: today, n: (card ? card.n : 0) + 1 };
    if (detail) {
      st.log.unshift({ t: clock(), skill, q: detail.q || '', a: detail.a || '', picked: detail.picked || '' });
      if (st.log.length > 60) st.log.length = 60;
    }
  } else if (card && card.due <= today) {
    if (card.box >= COME_BACK.length) delete st.review[key];
    else {
      card.due = today + COME_BACK[card.box];
      card.box++;
    }
  }
}

// After a mission, a skill that is going well moves up a level; one that is
// going badly moves down.
function settleTier(skill) {
  const sk = skillState(skill);
  if (sk.recent.length < 8) return;
  const share = sk.recent.reduce((a, b) => a + b, 0) / sk.recent.length;
  if (share >= 0.85 && sk.tier < 3) {
    sk.tier++;
    sk.recent = [];
  } else if (share <= 0.5 && sk.tier > 1) {
    sk.tier--;
    sk.recent = [];
  }
}

export const recentKeys = (skill) => (S().skills[skill] ? S().skills[skill].last : []);

// Missed items that are due to come back, for one skill or for all of them.
export function dueKeys(skill) {
  const st = S();
  const today = dayNumber();
  return Object.keys(st.review).filter((key) => st.review[key].due <= today && (!skill || key.startsWith(skill + ':')));
}

export function skillReport() {
  const st = S();
  return Object.values(SKILLS).map((skill) => {
    const sk = st.skills[skill.id];
    return { id: skill.id, name: skill.name, sector: skill.sector, seen: sk ? sk.seen : 0, right: sk ? sk.right : 0, tier: sk ? sk.tier : 1, medal: medalOf(skill.id), waiting: Object.keys(st.review).filter((k) => k.startsWith(skill.id + ':')).length };
  });
}

// ---- finishing a mission

export const medalFor = (share) => (share >= MEDAL_AT[2] ? 3 : share >= MEDAL_AT[1] ? 2 : share >= MEDAL_AT[0] ? 1 : 0);

// result: { completed, decisions, firstTry, corrected, bestStreak, crystals, damage, skills: [ids] }
// Returns what the results screen needs to show.
export function finishMission(id, result) {
  const st = S();
  const before = rankOf();
  const hadBadges = { ...st.badges };
  const wasOpen = new Set(MISSIONS.filter((m) => missionOpen(m.id)).map((m) => m.id));
  const share = result.decisions ? result.firstTry / result.decisions : 0;
  // a finished mission always earns at least bronze: getting through it counts
  const medal = result.completed ? Math.max(1, medalFor(share)) : 0;
  const rec = st.missions[id] || (st.missions[id] = { medal: 0, best: 0, plays: 0, last: 0 });
  const firstWin = result.completed && rec.medal === 0;
  const bonus = medal > rec.medal ? MEDAL_PAY[medal] - MEDAL_PAY[rec.medal] : 0;
  const xp = result.firstTry * 10 + result.corrected * 4 + (result.completed ? medal * 15 : 0);
  rec.plays++;
  rec.last = clock();
  // a mission that keeps ending in an emergency warp gets easier to survive
  rec.fails = result.completed ? 0 : (rec.fails || 0) + 1;
  if (result.completed) {
    rec.best = Math.max(rec.best, share);
    rec.medal = Math.max(rec.medal, medal);
    markPlayed();
    if (id.startsWith('boss-') && firstWin) st.counters.bosses++;
    if (result.decisions >= 5 && result.firstTry === result.decisions) st.counters.perfect++;
    if (result.damage === 0) st.counters.noHit++;
  }
  st.counters.bestStreak = Math.max(st.counters.bestStreak, result.bestStreak || 0);
  st.crystals += result.crystals + bonus;
  st.xp += xp;
  for (const skill of result.skills || []) settleTier(skill);

  // prizes: ships and paint won from bosses
  const prizes = [];
  SHIP_LIST.forEach((ship) => {
    if (ship.boss >= 0 && !st.owned.ships.includes(ship.id) && medalOf('boss-' + SECTORS[ship.boss].boss.id) > 0) {
      st.owned.ships.push(ship.id);
      prizes.push({ kind: 'ship', id: ship.id });
    }
  });
  PAINT_LIST.forEach((paint) => {
    if (paint.prize !== undefined && !st.owned.paints.includes(paint.id) && medalOf('boss-' + SECTORS[paint.prize].boss.id) > 0) {
      st.owned.paints.push(paint.id);
      prizes.push({ kind: 'paint', id: paint.id });
    }
  });
  const badges = awardBadges(hadBadges);
  const after = rankOf();
  const opened = MISSIONS.filter((m) => missionOpen(m.id) && !wasOpen.has(m.id)).map((m) => m.id);
  save();
  return { medal, best: rec.medal, share, bonus, xp, crystals: result.crystals, rankUp: after.index > before.index ? after.name : '', rank: after, badges, prizes, opened, help: helpShields(id) };
}

// Extra shields for a mission that was not finished last time: one for each
// emergency warp in a row, up to three. They go again once it is finished.
export const helpShields = (id) => Math.min(3, (S().missions[id] && S().missions[id].fails) || 0);

function awardBadges(had) {
  const st = S();
  const won = [];
  for (const badge of BADGES) {
    if (!st.badges[badge.id] && badge.test(st)) {
      st.badges[badge.id] = clock();
      if (!had[badge.id]) won.push(badge);
    }
  }
  return won;
}

// ---- the daily patrol: a mixed review, with a bonus once a day

export const patrolOpen = () => medalOf(SECTORS[0].skills[1]) > 0 || S().settings.unlockAll;
export const patrolFlownToday = () => S().patrol.day === dayNumber();

export function finishPatrol(result) {
  const st = S();
  const before = rankOf();
  const hadBadges = { ...st.badges };
  const first = !patrolFlownToday();
  const bonus = result.completed && first ? 60 : 0;
  const xp = result.firstTry * 10 + result.corrected * 4;
  if (result.completed) {
    markPlayed();
    if (first) {
      st.patrol.day = dayNumber();
      st.counters.patrols++;
    }
  }
  st.counters.bestStreak = Math.max(st.counters.bestStreak, result.bestStreak || 0);
  st.crystals += result.crystals + bonus;
  st.xp += xp;
  for (const skill of result.skills || []) settleTier(skill);
  const badges = awardBadges(hadBadges);
  const after = rankOf();
  save();
  const share = result.decisions ? result.firstTry / result.decisions : 0;
  return { medal: result.completed ? Math.max(1, medalFor(share)) : 0, best: 0, share, bonus, xp, crystals: result.crystals, rankUp: after.index > before.index ? after.name : '', rank: after, badges, prizes: [], opened: [], patrol: true };
}

// ---- the hangar

export function upgradeCost(id) {
  const up = UPGRADES.find((u) => u.id === id);
  const level = S().up[id] || 0;
  return up && level < up.costs.length ? up.costs[level] : null;
}
export function buyUpgrade(id) {
  const st = S();
  const cost = upgradeCost(id);
  if (cost === null || st.crystals < cost) return false;
  st.crystals -= cost;
  st.up[id]++;
  awardBadges({});
  save();
  return true;
}
export function buyPaint(id) {
  const st = S();
  const paint = PAINT_LIST.find((p) => p.id === id);
  if (!paint || paint.prize !== undefined || st.owned.paints.includes(id) || st.crystals < paint.cost) return false;
  st.crystals -= paint.cost;
  st.owned.paints.push(id);
  st.paint = id;
  awardBadges({});
  save();
  return true;
}
export function choose(kind, id) {
  const st = S();
  if (kind === 'ship' && st.owned.ships.includes(id)) st.ship = id;
  if (kind === 'paint' && st.owned.paints.includes(id)) st.paint = id;
  save();
}

// ---- backup code for the grown-ups page

export function exportCode() {
  const text = JSON.stringify(S());
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return 'QF1.' + btoa(bin);
}
export function importCode(code) {
  try {
    const clean = String(code).trim();
    if (!clean.startsWith('QF1.')) return false;
    const bin = atob(clean.slice(4));
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    const saved = JSON.parse(new TextDecoder().decode(bytes));
    if (!saved || saved.v !== 1 || !saved.pilot || !saved.missions) return false;
    state = merge(fresh(), saved);
    save();
    return true;
  } catch (e) {
    return false;
  }
}
