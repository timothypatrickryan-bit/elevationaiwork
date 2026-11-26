// Spot the fizzle: a sentence with one misspelled word. She finds it, then
// fixes it. Only used with words she has already mastered, so that seeing a
// wrong spelling practices checking her work without teaching the mistake.

import { fullSentence, pretty } from '../words.js';
import { sfx } from '../audio.js';
import { createKeyboard } from '../keyboard.js';
import { esc, burstFrom } from '../ui.js';
import { frame, typedTiles, studyTiles } from './parts.js';

export function proof(host, { word, onDone }) {
  const target = word.key;
  const f = frame(host, 'act-proof');
  const tokens = fullSentence(word.sentence, '\u0001').split(/\s+/);
  let stage = 'find'; // find | fix | done
  let wrongTaps = 0;
  let typed = '';
  let tries = 0;
  let found = false;
  let fixed = false;
  let gone = false;

  const kb = createKeyboard({
    onKey(k) {
      if (stage !== 'fix' || typed.length >= target.length + 4) return;
      typed += k;
      sfx('key');
      paint();
    },
    onBack() {
      if (stage !== 'fix') return;
      typed = typed.slice(0, -1);
      sfx('back');
      paint();
    },
    onEnter: () => step(),
  });

  function sentenceHtml() {
    return `<p class="proof-line">${tokens
      .map((token, i) => {
        if (!token.includes('\u0001')) return `<button class="proof-word" data-token="${i}"${stage === 'find' ? '' : ' disabled'}>${esc(token)}</button>`;
        const [before, after] = token.split('\u0001');
        const shown = stage === 'done' ? target : word.wrong;
        const cls = stage === 'find' ? '' : stage === 'done' ? ' is-fixed' : ' is-found';
        return `<button class="proof-word${cls}" data-token="${i}" data-bad="1"${stage === 'find' ? '' : ' disabled'}>${esc(before)}${esc(pretty(shown))}${esc(after)}</button>`;
      })
      .join(' ')}</p>`;
  }

  function paint() {
    f.stage.innerHTML = sentenceHtml() + (stage === 'fix' ? typedTiles(typed) : stage === 'done' ? studyTiles(word, 'is-right is-small') : '');
    if (stage === 'fix') f.enableGo(typed.length > 0);
    kb.setEnabled(stage === 'fix');
  }

  function finish() {
    stage = 'done';
    f.kb.innerHTML = '';
    f.setPet(fixed ? 'cheer' : 'smile');
    f.setLine(fixed ? 'Fizzle found and fixed.' : 'Here is the right spelling.');
    f.setNote(fixed ? '<b>Sharp eyes!</b> Checking your own writing works just like this.' : 'Reading each word slowly is how proofreaders catch these.', fixed ? 'right' : 'study');
    f.setGo('Next');
    sfx(fixed ? 'right' : 'tap');
    paint();
    if (fixed) burstFrom(f.stage.querySelector('.proof-word.is-fixed'), 10);
  }

  function step() {
    if (gone || !f.goReady()) return;
    if (stage === 'done') {
      destroy();
      return onDone({ found, fixed });
    }
    if (stage !== 'fix' || !typed) return;
    if (typed === target) {
      fixed = true;
      return finish();
    }
    tries++;
    if (tries >= 2) return finish();
    sfx('fizzle');
    typed = '';
    f.setNote('Not quite. Have one more go at the right spelling.', 'fizzle');
    paint();
  }

  function onClick(event) {
    if (event.target.closest('[data-go]')) return step();
    const token = event.target.closest('.proof-word');
    if (!token || stage !== 'find') return;
    if (token.dataset.bad) {
      found = wrongTaps < 2;
      stage = 'fix';
      sfx('pick');
      f.setLine('You found it. Now spell it the right way.');
      f.setNote('');
      f.setGo('Cast', false);
      f.kb.appendChild(kb.el);
      return paint();
    }
    wrongTaps++;
    sfx('back');
    token.classList.add('shake');
    if (wrongTaps >= 2) {
      // Point it out so she is never stuck.
      stage = 'fix';
      f.setLine('It was this one. Spell it the right way.');
      f.setNote('');
      f.setGo('Cast', false);
      f.kb.appendChild(kb.el);
      return paint();
    }
    f.setNote('That word is spelled right. Look again.', 'fizzle');
  }
  host.addEventListener('click', onClick);

  function destroy() {
    if (gone) return;
    gone = true;
    host.removeEventListener('click', onClick);
    kb.destroy();
  }

  f.setPet('think');
  f.setLine('One word in this sentence has fizzled. Tap it.');
  f.setGo('');
  paint();
  return { destroy };
}
