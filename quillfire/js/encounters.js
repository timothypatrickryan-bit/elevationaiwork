// Chooses what a mission asks. A mission is a list of "steps"; each step is one
// wave of ships. This is where the game adapts to the player:
//   - items that were missed and are due come back first,
//   - items at the skill's current level are preferred,
//   - items seen lately wait their turn.

import { SKILLS, SECTORS, TRAINING, TRAINING_ANIMALS } from './content/index.js';
import { LINES } from './content/voice-lines.js';
import { tierOf, dueKeys, recentKeys, medalOf, S } from './store.js';

export function shuffle(list, rnd) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const sample = (list, rnd) => list[Math.floor(rnd() * list.length)];

const KIND_WORD = { noun: 'NOUN', verb: 'VERB', adjective: 'ADJECTIVE' };
const KIND_MANY = { noun: 'NOUNS', verb: 'VERBS', adjective: 'ADJECTIVES' };

// How long the Garblers wait before they fire, in seconds. Reading takes time,
// so longer questions get longer. Passages have no clock at all.
export function thinkTime(step) {
  if (step.prompt && step.prompt.passage) return 0;
  const chars = ((step.prompt && step.prompt.text) || '').length + (step.options ? step.options.reduce((n, o) => n + o.label.length, 0) : 0);
  if (step.type === 'bins') return 10 + chars * 0.07;
  if (step.type === 'pick') return 11 + chars * 0.1;
  if (step.type === 'tap') return 13 + step.tokens.length * 1.7;
  if (step.type === 'order') return 13 + step.seq.length * 2.6;
  return 0;
}

// An item from the content becomes a step: answers shuffled, nothing shared
// with the item itself, so a step can be changed freely while it is played.
export function stepFor(item, rnd) {
  const skill = SKILLS[item.skill];
  const step = { type: item.kind, skill: item.skill, key: item.key, prompt: item.prompt, why: item.why, say: item.say, tip: skill ? skill.tip : '', tipSay: skill ? skill.tipSay || skill.tip : '', lv: item.lv };
  if (item.kind === 'pick') step.options = shuffle(item.options, rnd).map((o) => ({ ...o }));
  else if (item.kind === 'bins') step.options = item.options.map((o) => ({ ...o }));
  else if (item.kind === 'tap') step.tokens = item.tokens.map((t) => ({ ...t }));
  else if (item.kind === 'order') {
    step.seq = item.seq.slice();
    let shown = shuffle(item.seq.map((_, i) => i), rnd);
    if (shown.every((v, i) => v === i)) shown = shown.slice(1).concat(shown[0]); // never hand it over already in order
    step.shown = shown;
  }
  step.time = thinkTime(step);
  return step;
}

// Picks n items of one kind from a skill.
function chooseItems(skillId, kind, n, rnd, taken = new Set()) {
  const skill = SKILLS[skillId];
  const pool = skill.items.filter((i) => i.kind === kind && !taken.has(i.key));
  const tier = tierOf(skillId);
  const due = new Set(dueKeys(skillId));
  const recent = recentKeys(skillId);
  const scored = pool
    .map((item) => {
      const at = recent.indexOf(item.key);
      const rest = at < 0 ? 2.5 : Math.min(recent.length - 1 - at, 40) / 20;
      const fit = item.lv === tier ? 3 : item.lv < tier ? 1.5 : item.lv === tier + 1 ? 0.8 : 0;
      return { item, score: rnd() + fit + rest + (due.has(item.key) ? 10 : 0) };
    })
    .sort((a, b) => b.score - a.score);
  const out = [];
  const passages = new Set();
  let again = 0;
  for (const pass of [1, 2]) {
    for (const { item } of scored) {
      if (out.length >= n) break;
      if (out.includes(item)) continue;
      if (pass === 1) {
        if (due.has(item.key) && again >= Math.ceil(n / 3)) continue; // not a whole mission of repeats
        if (item.passage && passages.has(item.passage)) continue; // one question per passage
      }
      if (due.has(item.key)) again++;
      if (item.passage) passages.add(item.passage);
      out.push(item);
    }
  }
  out.forEach((item) => taken.add(item.key));
  // easier ones toward the front, with some mixing
  return out.map((item) => ({ item, at: item.lv + rnd() * 1.2 })).sort((a, b) => a.at - b.at).map((x) => x.item);
}

// ---- kinds of words: the sorting skills have views made on the spot

function chooseWords(skill, ok, n, rnd, taken) {
  const due = new Set(dueKeys(skill.id));
  const recent = recentKeys(skill.id);
  return skill.words
    .filter((w) => w.ok === ok && !taken.has(w.key))
    .map((w) => {
      const at = recent.indexOf(w.key);
      return { w, score: rnd() + (at < 0 ? 1.5 : Math.min(recent.length - 1 - at, 40) / 30) + (due.has(w.key) ? 4 : 0) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => {
      taken.add(x.w.key);
      return x.w;
    });
}

function sortStep(skill, n, rnd, taken) {
  const yes = chooseWords(skill, true, Math.ceil(n / 2), rnd, taken);
  const no = chooseWords(skill, false, Math.floor(n / 2), rnd, taken);
  let words = shuffle([...yes, ...no], rnd);
  // no long runs of the same answer
  for (let i = 3; i < words.length; i++) {
    if (words[i].ok === words[i - 1].ok && words[i].ok === words[i - 2].ok && words[i].ok === words[i - 3].ok) {
      const swap = words.findIndex((w, j) => j > i && w.ok !== words[i].ok);
      if (swap > 0) [words[i], words[swap]] = [words[swap], words[i]];
    }
  }
  words = words.map((w) => ({ ...w }));
  return { type: 'sort', skill: skill.id, key: skill.id + ':wave', prompt: { ask: 'Zap every', big: KIND_WORD[skill.pos], sub: 'Let the other ships fly by!' }, words, tip: skill.tip, tipSay: skill.tipSay || skill.tip, time: 0 };
}

function wordPickStep(skill, rnd, taken, forced) {
  const answer = forced && forced.ok ? forced : chooseWords(skill, true, 1, rnd, taken)[0];
  const others = skill.words.filter((w) => !w.ok && w !== forced);
  const wrong = [];
  if (forced && !forced.ok) wrong.push(forced);
  const kinds = shuffle(Object.keys(KIND_WORD).filter((k) => k !== skill.pos), rnd);
  while (wrong.length < 2) {
    const kind = kinds[wrong.length % kinds.length];
    const w = sample(others.filter((o) => SKILLS[kind + 's'].words.find((x) => x.label === o.label && x.ok) && !wrong.includes(o)), rnd);
    if (w) wrong.push(w);
  }
  const options = shuffle([{ label: answer.label, ok: true }, ...wrong.map((w) => ({ label: w.label, ok: false, why: w.why }))], rnd);
  const step = { type: 'pick', skill: skill.id, key: answer.key, prompt: { ask: skill.pos === 'adjective' ? 'Which one is an' : 'Which one is a', big: KIND_WORD[skill.pos] + '?' }, options, why: answer.why, say: null, tip: skill.tip, tipSay: skill.tipSay || skill.tip, lv: 1 };
  step.time = thinkTime(step);
  return step;
}

// ---- missions

function skillSteps(skill, rnd) {
  const taken = new Set();
  const steps = [];
  for (const [view, n] of skill.plan) {
    if (view === 'sort') steps.push(sortStep(skill, n, rnd, taken));
    else if (view === 'pick' && skill.words) for (let i = 0; i < n; i++) steps.push(wordPickStep(skill, rnd, taken));
    else chooseItems(skill.id, view, n, rnd, taken).forEach((item) => steps.push(stepFor(item, rnd)));
  }
  return steps;
}

// Any item from a set of skills, in kinds that suit a boss fight or a patrol:
// no passages (too long for the middle of a fight) and no whole sorting waves.
// `want` is how many waves are needed in all, so that a few skills give enough.
function mixedPool(skillIds, rnd, want = 12) {
  const pool = [];
  const each = Math.max(3, Math.ceil(want / Math.max(1, skillIds.length)) + 1);
  for (const id of skillIds) {
    const skill = SKILLS[id];
    const taken = new Set();
    if (skill.words) {
      const taps = Math.min(3, Math.ceil(each / 4));
      for (let i = 0; i < each - taps; i++) pool.push(wordPickStep(skill, rnd, taken));
      chooseItems(id, 'tap', taps, rnd, taken).forEach((item) => pool.push(stepFor(item, rnd)));
      continue;
    }
    if (skill.reading) continue;
    const kinds = [...new Set(skill.items.map((i) => i.kind))];
    for (const kind of kinds) chooseItems(id, kind, Math.ceil(each / kinds.length) + (kind === 'bins' ? 1 : 0), rnd, taken).forEach((item) => pool.push(stepFor(item, rnd)));
  }
  return pool;
}

function spreadOut(pool, n, rnd) {
  // take from each skill in turn, so a fight covers the whole sector
  const bySkill = new Map();
  for (const step of shuffle(pool, rnd)) {
    if (!bySkill.has(step.skill)) bySkill.set(step.skill, []);
    bySkill.get(step.skill).push(step);
  }
  const lists = shuffle([...bySkill.values()], rnd);
  const out = [];
  while (out.length < n && lists.some((l) => l.length)) {
    for (const l of lists) if (l.length && out.length < n) out.push(l.shift());
  }
  return out;
}

export function buildMission(mission, rnd) {
  if (mission.boss) {
    let skills = mission.skills;
    if (mission.sector === SECTORS.length - 1) {
      // the last boss tests everything
      const earlier = SECTORS.slice(0, -1).flatMap((s) => s.skills);
      skills = [...skills, ...shuffle(earlier, rnd).slice(0, 10)];
    }
    return spreadOut(mixedPool(skills, rnd, mission.boss.hp + 8), mission.boss.hp + 8, rnd);
  }
  return skillSteps(SKILLS[mission.skill], rnd);
}

// The daily patrol: what is due to come back, then the skills going least well.
export function buildPatrol(rnd, n = 10) {
  const played = Object.keys(SKILLS).filter((id) => medalOf(id) > 0 || S().settings.unlockAll);
  const skills = played.length ? played : [SECTORS[0].skills[0]];
  const steps = [];
  const used = new Set();
  for (const key of shuffle(dueKeys(), rnd)) {
    if (steps.length >= Math.ceil(n * 0.6)) break;
    const skill = SKILLS[key.split(':')[0]];
    if (!skill || !skills.includes(skill.id) || used.has(key)) continue;
    const item = skill.items.find((i) => i.key === key);
    if (item && !item.passage) steps.push(stepFor(item, rnd));
    else if (skill.words) {
      const word = skill.words.find((w) => w.key === key);
      if (word) steps.push(wordPickStep(skill, rnd, new Set(), word));
    } else continue;
    used.add(key);
  }
  const st = S();
  const weakest = skills
    .map((id) => ({ id, share: st.skills[id] && st.skills[id].seen ? st.skills[id].right / st.skills[id].seen : 0.7, r: rnd() }))
    .sort((a, b) => a.share - b.share || a.r - b.r)
    .slice(0, 5)
    .map((x) => x.id);
  const fill = spreadOut(mixedPool(weakest, rnd, n + 4).filter((s) => !used.has(s.key)), n - steps.length, rnd);
  return shuffle([...steps, ...fill], rnd);
}

// Flight school.
export function buildTraining(rnd) {
  const steps = TRAINING.map((item) => stepFor(item, rnd));
  steps[0].coach = LINES.coach[0];
  steps[1].coach = LINES.coach[1];
  steps[1].drill = 'dodge';
  steps[2].coach = LINES.coach[2];
  steps[2].drill = 'scan';
  const words = shuffle([...TRAINING_ANIMALS.yes.slice(0, 4).map((label) => ({ label, ok: true })), ...TRAINING_ANIMALS.no.slice(0, 4).map((label) => ({ label, ok: false }))], rnd).map((w) => ({
    ...w,
    key: 'training:' + w.label,
    why: w.ok ? `A ${w.label} is an animal.` : `A ${w.label} is not an animal.`,
  }));
  steps.push({ type: 'sort', skill: 'training', key: 'training:wave', prompt: { ask: 'Zap every', big: 'ANIMAL', sub: 'Let the other ships fly by!' }, words, tip: LINES.coach[4], time: 0, coach: LINES.coach[3] });
  steps.forEach((s) => {
    s.time = s.time ? s.time * 1.5 : 0;
    s.tip = s.tip || '';
  });
  return steps;
}

export { KIND_MANY };
