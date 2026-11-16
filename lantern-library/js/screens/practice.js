// A quick round of word practice with the words in the jar.

import { WORDS } from '../content/index.js';
import { S, jarWords, dueWords, gradeWord, glowOf, finishPractice, save } from '../store.js';
import { icon, glim } from '../art.js';
import { sfx } from '../audio.js';
import { mount, esc, shuffle, pick, plural } from '../ui.js';
import { go } from '../nav.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Three wrong answers for a word: the same kind of word if possible, and
// words she already knows about before words she has never seen.
function othersFor(word, jarKeys) {
  const score = (w) => (w.pos === word.pos ? 2 : 0) + (jarKeys.has(w.key) ? 1 : 0);
  return shuffle(Array.from(WORDS.values()).filter((w) => w.key !== word.key))
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3);
}

function makeItem(word, jarKeys) {
  const others = othersFor(word, jarKeys);
  const kinds = word.box <= 1 ? ['meaning', 'define'] : ['sentence', 'sentence', 'define', 'meaning'];
  const kind = pick(kinds);
  const options = shuffle([word, ...others]);
  if (kind === 'meaning') {
    return { word, lead: 'What does this word mean?', prompt: `<strong>${esc(word.word)}</strong>`, choices: options.map((o) => ({ text: o.def, right: o.key === word.key })) };
  }
  if (kind === 'define') {
    return { word, lead: 'Which word matches this meaning?', prompt: esc(cap(word.def)) + '.', choices: options.map((o) => ({ text: o.word, right: o.key === word.key })) };
  }
  return {
    word,
    lead: 'Which word finishes the sentence?',
    prompt: esc(word.ex).replace(/\*[^*]+\*/, '<u>&nbsp;</u>'),
    choices: options.map((o) => ({ text: o.word, right: o.key === word.key })),
  };
}

export function open(app) {
  const jarList = jarWords();
  if (jarList.length < 4) return go('words');
  const jarKeys = new Set(jarList.map((w) => w.key));
  const due = dueWords();
  const dueKeys = new Set(due.map((w) => w.key));
  let pool = due.slice(0, 8);
  if (pool.length < 4) {
    const rest = jarList.filter((w) => !dueKeys.has(w.key)).sort((a, b) => a.box - b.box || a.seen - b.seen);
    pool = pool.concat(rest.slice(0, 4 - pool.length));
  }
  const round = shuffle(pool).map((w) => makeItem(w, jarKeys));
  const glowBefore = new Map(pool.map((w) => [w.key, glowOf(w.key)]));
  const started = Date.now();
  let at = 0;
  let right = 0;
  let answered = false;

  const el = mount(
    app,
    'practice',
    `<header class="topbar">
      <button class="icon-btn" data-act="back" aria-label="Back to the jar">${icon('back')}</button>
      <h1 class="topbar-title">Word practice</h1>
      <div class="stats"><div class="pbar" aria-hidden="true"><i></i></div><span class="stat" data-count></span></div>
    </header>
    <main class="practice-main"><div class="pcard"></div></main>`,
    {
      back() {
        sfx('tap');
        save();
        go('words');
      },
      answer(target) {
        if (answered) return;
        answered = true;
        const item = round[at];
        const good = target.dataset.right === '1';
        if (good) right++;
        gradeWord(item.word.key, good, !dueKeys.has(item.word.key));
        save();
        sfx(good ? 'right' : 'almost');
        card.querySelectorAll('.choice').forEach((b) => {
          b.disabled = true;
          if (b.dataset.right === '1') {
            b.classList.add('is-right');
            b.querySelector('.choice-key').innerHTML = icon('check');
          } else if (b === target) b.classList.add('is-wrong');
          else b.classList.add('is-dim');
        });
        const example = esc(item.word.ex).replace(/\*([^*]+)\*/g, '<b>$1</b>');
        card.querySelector('.pfoot').innerHTML = `<p class="pnote">${good ? '' : 'Not this time. '}<b>${esc(cap(item.word.word))}</b> means ${esc(item.word.def)}. <em>${example}</em></p>
          <button class="btn btn-gold btn-big" data-act="next">${at + 1 < round.length ? 'Next word' : 'Finish'}</button>`;
        const next = card.querySelector('[data-act="next"]');
        if (next.scrollIntoView) next.scrollIntoView({ block: 'nearest' });
      },
      next() {
        sfx('tap');
        at++;
        if (at < round.length) show();
        else done();
      },
      again() {
        go('practice');
      },
    }
  );
  const card = el.querySelector('.pcard');

  function progress() {
    el.querySelector('.pbar i').style.transform = `scaleX(${at / round.length})`;
    el.querySelector('[data-count]').textContent = `${Math.min(at + 1, round.length)} / ${round.length}`;
  }

  function show() {
    answered = false;
    const item = round[at];
    progress();
    card.innerHTML = `<p class="eyebrow">${item.lead}</p>
      <h2 class="prompt">${item.prompt}</h2>
      <div class="choices">${item.choices
        .map((c, k) => `<button class="choice" data-act="answer" data-right="${c.right ? 1 : 0}"><span class="choice-key">${'ABCD'[k]}</span><span class="choice-text">${esc(c.text)}</span></button>`)
        .join('')}</div>
      <div class="pfoot"></div>`;
  }

  function done() {
    const out = finishPractice({ right, total: round.length, secs: Math.round((Date.now() - started) / 1000) });
    const brighter = pool.filter((w) => glowOf(w.key) > glowBefore.get(w.key));
    el.querySelector('.pbar i').style.transform = 'scaleX(1)';
    el.querySelector('[data-count]').textContent = `${round.length} / ${round.length}`;
    const st = S();
    card.innerHTML = `<div style="width:120px;margin:0 auto">${glim({ glow: st.glim.glow, wear: st.glim.wear, mood: right === round.length ? 'cheer' : 'smile', cls: 'is-cheer' })}</div>
      <p class="eyebrow" style="text-align:center">Practice done</p>
      <h2 class="display" style="text-align:center;font-size:var(--t-2xl)">${right} of ${round.length} right</h2>
      <p class="pnote" style="text-align:center">You earned <b>${plural(out.sparks, 'spark')}</b>.${
        brighter.length ? ` Glowing brighter now: <b>${brighter.map((w) => esc(w.word)).join(', ')}</b>.` : ''
      }${out.badges.length ? ` New badge: <b>${out.badges.map((b) => esc(b.name)).join(', ')}</b>.` : ''}</p>
      <div class="results-actions">
        <button class="btn btn-gold btn-big" data-act="back">Back to the jar</button>
        ${dueWords().length >= 4 ? `<button class="btn btn-ghost" data-act="again">Practice more</button>` : ''}
      </div>`;
    sfx('lantern');
  }

  show();
}
