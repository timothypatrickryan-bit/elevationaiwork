// Working on one jar. The order follows how spelling is best taught to a
// child who finds it hard:
//   quick check   five words, one try each, to find what she already knows
//   the rule      one idea in plain words
//   rule cards    applying the rule before spelling anything
//   build         the words with support: missing letters, scrambles, joins
//   cast          the same words from memory, with help after a miss
// A jar she already knows is passed at the quick check and the lesson is skipped.

import { findUnit, wordsOf } from '../content/index.js';
import { S, starsOf, unitDone, wasChecked, noteChecked, finishUnit, nextUnit, glowOf } from '../store.js';
import { jar, stars, icon, badgeArt } from '../art.js';
import { sfx, speechOn } from '../audio.js';
import { esc, rich, shuffle, plural, burstFrom } from '../ui.js';
import { pretty } from '../words.js';
import { createSession } from '../session.js';
import { dictation } from '../activities/dictation.js';
import { fill, scramble, join } from '../activities/build.js';
import { cards } from '../activities/cards.js';
import { petHtml, petName } from '../activities/parts.js';
import { go } from '../nav.js';

const CHECK_WORDS = 5;
const LESSON_WORDS = 6;

// Five words for the quick check, spread over the unit's sort answers when it has them.
function pickCheckWords(words) {
  const byBin = new Map();
  for (const w of shuffle(words)) {
    const key = Number.isInteger(w.bin) ? w.bin : 'x';
    if (!byBin.has(key)) byBin.set(key, []);
    byBin.get(key).push(w);
  }
  const out = [];
  const groups = Array.from(byBin.values());
  while (out.length < CHECK_WORDS && groups.some((g) => g.length)) {
    for (const g of groups) if (g.length && out.length < CHECK_WORDS) out.push(g.shift());
  }
  return shuffle(out);
}

// The six words most worth practicing: missed just now, then never met, then weakest.
function pickLessonWords(words, missedNow) {
  const st = S().words;
  const need = (w) => (missedNow.has(w.key) ? -1 : st[w.key] && st[w.key].seen ? st[w.key].box + 1 : 0.5);
  return shuffle(words)
    .sort((a, b) => need(a) - need(b))
    .slice(0, LESSON_WORDS);
}

export function tallyHtml(lines, total) {
  return `<ul class="tally">
    ${lines.map((l) => `<li><span>${esc(l.label)}</span><b>+${l.amount}</b></li>`).join('')}
    <li class="tally-total"><span>Earned</span><b>${icon('spark')} ${total}</b></li></ul>`;
}

export function earnedHtml(badges, shelves = []) {
  if (!badges.length && !shelves.length) return '';
  return `<div class="box box-wide"><h2>${icon('badge')} Just earned</h2>
    ${badges.map((b) => `<div class="earned"><span class="medal">${badgeArt(b.art)}</span><div><b>${esc(b.name)}</b><span>${esc(b.how)}</span></div></div>`).join('')}
    ${shelves.map((sh) => `<div class="earned"><span class="medal medal-shelf">${icon('jar')}</span><div><b>New shelf: ${esc(sh.name)}</b><span>${esc(sh.about)}</span></div></div>`).join('')}
  </div>`;
}

export const wordChips = (list) => `<div class="chips">${list.map((w) => `<span class="chip glow-${glowOf(w.key)}">${esc(pretty(w.key))}</span>`).join('')}</div>`;

export function open(app, params) {
  const found = findUnit(params.id);
  if (!found) return go('home');
  const { unit, shelf, shelfIndex } = found;
  const words = wordsOf(unit);
  const started = Date.now();
  let left = false;

  const session = createSession(app, {
    title: unit.name,
    sub: shelf.name,
    hue: shelf.hue,
    onExit: () => go('home'),
    leave: { title: 'Leave this jar?', body: 'The words you have spelled are saved, but the jar is only filled when you finish.', yes: 'Leave', no: 'Keep going' },
  });
  const secs = () => Math.round((Date.now() - started) / 1000);
  const talk = (mood, text, big = true) => `<div class="talk${big ? ' talk-big' : ''}"><div class="talk-pet">${petHtml(mood)}</div><p class="bubble">${text}</p></div>`;

  async function intro() {
    const done = unitDone(unit.id);
    const checked = wasChecked(unit.id);
    // The quick check only means something when she has to spell from sound.
    const canCheck = speechOn();
    session.progress(done ? 'Brew again' : 'New jar', 0, 0);
    let say;
    let button;
    if (done) {
      say = 'This jar is already on the shelf. Brew it again to make these words stronger and to go for more stars.';
      button = 'Brew again';
    } else if (checked) {
      say = 'You have had the quick check, so I know which words to work on. Here is how they work.';
      button = 'Show me the rule';
    } else if (canCheck) {
      say = 'First a quick check: five words, one try each. It only tells me what you already know, so a miss costs nothing.';
      button = 'Start the quick check';
    } else {
      say = 'This jar holds one spelling secret. I will show you the rule first, then we practice.';
      button = 'Show me the rule';
    }
    await session.panel(`
      <div class="panel-jar">${jar(shelfIndex, starsOf(unit.id))}</div>
      <p class="eyebrow">${esc(shelf.name)}</p>
      <h1 class="display">${esc(unit.name)}</h1>
      <p class="panel-lead">${esc(unit.about)}</p>
      ${talk('smile', esc(say), false)}
      <button class="btn btn-main btn-big" data-go>${button}</button>`);
    if (done || checked || !canCheck) return lesson(new Set());
    return check();
  }

  async function check() {
    session.guard(true);
    const picked = pickCheckWords(words);
    const results = [];
    const missed = new Set();
    for (let i = 0; i < picked.length; i++) {
      session.progress('Quick check', i, picked.length);
      const out = await session.run(dictation, { word: picked[i], quick: true });
      results.push(out.credit);
      if (out.credit !== 'first') missed.add(picked[i].key);
    }
    const right = results.filter((r) => r === 'first').length;
    if (right >= CHECK_WORDS - 1) {
      const result = finishUnit({ unitId: unit.id, via: 'check', results, secs: secs() });
      return showResults(result, `You already know this one: ${right} of ${picked.length} in the quick check.`);
    }
    noteChecked(unit.id);
    session.progress('Quick check done', 0, 0);
    await session.panel(`
      ${talk('smile', `${right} of ${picked.length}. Good, now I know exactly what to brew. This jar has one idea in it, and once you have it these words get much easier.`)}
      <button class="btn btn-main btn-big" data-go>Show me the rule</button>`);
    return lesson(missed);
  }

  async function lesson(missedNow) {
    session.guard(true);
    // ---- the rule
    session.progress('The rule', 0, 0);
    await session.panel(`
      <p class="eyebrow">The rule</p>
      <h1 class="display">${esc(unit.name)}</h1>
      <ul class="rule">${unit.rule.map((line) => `<li>${rich(line)}</li>`).join('')}</ul>
      ${unit.chant ? `<p class="chant">${icon('wand')}<span>${esc(unit.chant)}</span></p>` : ''}
      <button class="btn btn-main btn-big" data-go>Got it</button>`);

    // ---- rule cards (those that depend on hearing the word need the voice)
    const sort = unit.sort;
    if (sort && (!sort.audio || speechOn())) {
      await session.run(cards, { unit, onStep: (i, n) => session.progress('Rule cards', i, n) });
    }

    // ---- build, with support
    const picked = pickLessonWords(words, missedNow);
    for (let i = 0; i < picked.length; i++) {
      session.progress('Build', i, picked.length);
      const w = picked[i];
      const canScramble = w.key.length >= 4 && w.key.length <= 6 && !w.key.includes("'");
      const activity = unit.build === 'join' ? join : canScramble && Math.random() < 0.4 ? scramble : fill;
      await session.run(activity, { word: w });
    }

    // ---- cast, from memory
    session.progress('Cast', 0, 0);
    const how = speechOn()
      ? `Now the real thing: the same ${plural(picked.length, 'word')}, from memory. If a spell fizzles, ${esc(petName())} might look a bit odd for a moment. Just fix it.`
      : `Now the real thing. I will show each word for a moment. Look hard, then spell it from memory. If a spell fizzles, ${esc(petName())} might look a bit odd. Just fix it.`;
    await session.panel(`${talk('cheer', how)}<button class="btn btn-main btn-big" data-go>Start casting</button>`);
    const order = shuffle(picked);
    const results = [];
    const again = [];
    for (let i = 0; i < order.length; i++) {
      session.progress('Cast', i, order.length);
      const out = await session.run(dictation, { word: order[i] });
      results.push(out.credit);
      if (out.credit === 'missed') again.push(order[i]);
    }
    // One more look at anything missed, while it is fresh.
    for (let i = 0; i < again.length; i++) {
      session.progress('One more look', i, again.length);
      await session.run(fill, { word: again[i] });
    }
    const result = finishUnit({ unitId: unit.id, via: 'lesson', results, secs: secs() });
    const line =
      result.right === result.total
        ? `All ${result.total} right first time.`
        : `${result.right} of ${result.total} right first time${result.fixed ? `, and ${plural(result.fixed, 'fizzle')} fixed` : ''}.`;
    return showResults(result, line);
  }

  async function showResults(result, line) {
    if (left) return;
    session.guard(false);
    session.progress(result.firstTime ? 'Jar filled' : 'Brewed again', 0, 0);
    const up = nextUnit();
    const choice = session.panel(`
      <div class="panel-jar is-result">${jar(shelfIndex, result.best)}</div>
      <p class="eyebrow">${result.firstTime ? 'Jar filled' : result.improved ? 'Stronger than before' : 'Brewed again'}</p>
      <h1 class="display">${esc(unit.name)}</h1>
      <div class="results-stars">${stars(result.stars)}</div>
      <p class="panel-lead">${esc(line)}</p>
      <div class="results-grid">
        <div class="box"><h2>${icon('spark')} Sparks</h2>${tallyHtml(result.lines, result.sparks)}</div>
        <div class="box"><h2>${icon('book')} In this jar</h2>${wordChips(words)}
          <p class="box-note">Words you have not been asked yet will turn up in your reviews.</p></div>
        ${earnedHtml(result.badges, result.opened)}
      </div>
      <div class="panel-actions">
        ${up ? `<button class="btn btn-main btn-big" data-go="next">Next jar: ${esc(up.unit.name)}</button>` : ''}
        <button class="btn ${up ? 'btn-ghost' : 'btn-main btn-big'}" data-go="home">Back to the workshop</button>
        ${result.best < 3 ? `<button class="btn btn-ghost" data-go="again">${icon('again')} Brew again</button>` : ''}
      </div>`);
    sfx('jar');
    window.setTimeout(() => !left && burstFrom(session.main.querySelector('.panel-jar'), 18), 250);
    for (let i = 0; i < result.stars; i++) window.setTimeout(() => !left && sfx('star'), 800 + i * 280);
    const picked = await choice;
    if (picked === 'next' && up) return go('unit', { id: up.unit.id });
    if (picked === 'again') return go('unit', { id: unit.id });
    go('home');
  }

  intro();

  return {
    leave() {
      left = true;
      session.destroy();
    },
  };
}
