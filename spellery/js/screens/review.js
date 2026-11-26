// A review: words whose turn has come round again, spelled from memory. A
// miss sends the word back to the start; a clean spell pushes its next review
// further away. Mastered words can turn up in a short proofreading round.

import { WORDS } from '../content/index.js';
import { S, dueWords, finishReview, nextUnit, MASTERED_BOX } from '../store.js';
import { icon } from '../art.js';
import { sfx, speechOn, prepareVoice } from '../audio.js';
import { esc, shuffle, plural, burstFrom } from '../ui.js';
import { createSession } from '../session.js';
import { dictation } from '../activities/dictation.js';
import { fill } from '../activities/build.js';
import { proof } from '../activities/proof.js';
import { petHtml } from '../activities/parts.js';
import { tallyHtml, earnedHtml, wordChips } from './unit.js';
import { REVIEW_SIZE } from './home.js';
import { go } from '../nav.js';

const PROOF_ROUNDS = 2;

export function open(app) {
  const due = dueWords();
  if (!due.length) return go('home');
  const picked = shuffle(due.slice(0, REVIEW_SIZE));
  prepareVoice(picked.map((w) => w.key));
  const started = Date.now();
  let left = false;

  const session = createSession(app, {
    title: 'Review',
    sub: 'Your spellbook',
    hue: 'violet',
    onExit: () => go('home'),
    leave: { title: 'Leave the review?', body: 'The words you have spelled so far are saved.', yes: 'Leave', no: 'Keep going' },
  });
  const talk = (mood, text) => `<div class="talk talk-big"><div class="talk-pet">${petHtml(mood)}</div><p class="bubble">${text}</p></div>`;

  async function run() {
    session.progress('Review', 0, 0);
    const how = speechOn() ? 'Spell each one from memory.' : 'I will show each one for a moment, then you spell it from memory.';
    await session.panel(`
      ${talk('smile', `${plural(picked.length, 'word')} from your spellbook ${picked.length === 1 ? 'is' : 'are'} ready to come back. ${how} Getting a word right after a few days is what makes it stay.`)}
      <button class="btn btn-main btn-big" data-go>Start the review</button>`);

    session.guard(true);
    const results = [];
    const again = [];
    for (let i = 0; i < picked.length; i++) {
      session.progress('Review', i, picked.length);
      const out = await session.run(dictation, { word: picked[i] });
      results.push(out.credit);
      if (out.credit === 'missed') again.push(picked[i]);
    }
    for (let i = 0; i < again.length; i++) {
      session.progress('One more look', i, again.length);
      await session.run(fill, { word: again[i] });
    }

    // ---- bonus: spot the fizzle, with words she has already mastered
    const reviewed = new Set(picked.map((w) => w.key));
    const words = S().words;
    const pool = shuffle(Object.keys(words).filter((k) => WORDS.has(k) && words[k].box >= MASTERED_BOX && WORDS.get(k).wrong && !reviewed.has(k)))
      .slice(0, PROOF_ROUNDS)
      .map((k) => WORDS.get(k));
    let proofs = 0;
    if (pool.length) {
      session.progress('Bonus round', 0, 0);
      await session.panel(`
        ${talk('think', `Bonus round: spot the fizzle. One word in ${pool.length === 1 ? 'this sentence' : 'each sentence'} has gone wrong. These are words you have mastered, so trust your eyes.`)}
        <button class="btn btn-main btn-big" data-go>Find the fizzle</button>`);
      for (let i = 0; i < pool.length; i++) {
        session.progress('Spot the fizzle', i, pool.length);
        const out = await session.run(proof, { word: pool[i] });
        if (out.found && out.fixed) proofs++;
      }
    }

    const result = finishReview({ results, secs: Math.round((Date.now() - started) / 1000), proofs });
    if (left) return;
    session.guard(false);
    session.progress('Review done', 0, 0);
    const up = nextUnit();
    const more = dueWords().length;
    const line =
      result.right === result.total
        ? `All ${plural(result.total, 'word')} right first time.`
        : `${result.right} of ${result.total} right first time${result.fixed ? `, and ${plural(result.fixed, 'fizzle')} fixed` : ''}.`;
    const choice = session.panel(`
      <div class="panel-jar is-result is-book">${icon('bookfull')}</div>
      <p class="eyebrow">Review done</p>
      <h1 class="display">${plural(result.total, 'word')} reviewed</h1>
      <p class="panel-lead">${esc(line)}</p>
      <div class="results-grid">
        <div class="box"><h2>${icon('spark')} Sparks</h2>${tallyHtml(result.lines, result.sparks)}</div>
        <div class="box"><h2>${icon('book')} Reviewed</h2>${wordChips(picked)}
          <p class="box-note">Gold words are mastered. A missed word comes back soon.</p></div>
        ${earnedHtml(result.badges)}
      </div>
      <div class="panel-actions">
        ${up ? `<button class="btn btn-main btn-big" data-go="next">Next jar: ${esc(up.unit.name)}</button>` : ''}
        ${more ? `<button class="btn ${up ? 'btn-ghost' : 'btn-main btn-big'}" data-go="more">${icon('again')} Review ${plural(Math.min(more, REVIEW_SIZE), 'more word')}</button>` : ''}
        <button class="btn ${up || more ? 'btn-ghost' : 'btn-main btn-big'}" data-go="home">Back to the workshop</button>
      </div>`);
    sfx('jar');
    window.setTimeout(() => !left && burstFrom(session.main.querySelector('.panel-jar'), 16), 250);
    const next = await choice;
    if (next === 'next' && up) return go('unit', { id: up.unit.id });
    if (next === 'more') return go('review');
    go('home');
  }

  run();
  return {
    leave() {
      left = true;
      session.destroy();
    },
  };
}
