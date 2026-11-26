// The spellbook: every word in the game, colored by how well she knows it.
// Tapping a word opens it for study.

import { SHELVES, WORDS, TOTAL_WORDS, wordsOf } from '../content/index.js';
import { S, glowOf, starsOf, shelfOpen, masteredCount } from '../store.js';
import { stars, icon } from '../art.js';
import { sfx, speechOn, sayWord, saySentence, stopSpeaking } from '../audio.js';
import { mount, esc, rich, topbar, tabs, tabHandlers, grownupsGate, openModal } from '../ui.js';
import { pretty, fullSentence } from '../words.js';
import { studyTiles, clozeHtml } from '../activities/parts.js';

const GLOW_NAMES = ['Not asked yet', 'Learning', 'Getting stronger', 'Mastered'];

function whenNext(key) {
  const w = S().words[key];
  if (!w) return '';
  const days = Math.ceil((w.due - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Ready for a review now';
  return days === 1 ? 'Next review: tomorrow' : `Next review: in ${days} days`;
}

export function open(app) {
  const counts = [0, 0, 0, 0];
  for (const key of WORDS.keys()) counts[glowOf(key)]++;

  const shelves = SHELVES.map((shelf, i) => {
    if (!shelfOpen(i)) {
      return `<section class="bshelf is-locked" data-hue="${shelf.hue}">
        <h2>${icon('lock')} ${esc(shelf.name)}</h2>
        <p class="bshelf-note">${wordsLabel(shelf)} waiting on this shelf.</p>
      </section>`;
    }
    const units = shelf.units
      .map(
        (unit) => `<div class="bunit">
          <div class="bunit-head"><h3>${esc(unit.name)}</h3>${starsOf(unit.id) ? stars(starsOf(unit.id)) : ''}</div>
          <div class="chips">${wordsOf(unit)
            .map((w) => `<button class="chip glow-${glowOf(w.key)}" data-act="word" data-w="${esc(w.key)}">${esc(pretty(w.key))}</button>`)
            .join('')}</div>
        </div>`
      )
      .join('');
    return `<section class="bshelf" data-hue="${shelf.hue}"><h2>${esc(shelf.name)}</h2>${units}</section>`;
  }).join('');

  const screen = mount(
    app,
    'book',
    `${topbar('')}
    <main class="main">
      <div class="page-head">
        <h1 class="display">Spellbook</h1>
        <p>${masteredCount()} of ${TOTAL_WORDS} words mastered. Tap any word to study it.</p>
      </div>
      <div class="legend" role="list">
        ${[3, 2, 1, 0].map((g) => `<div class="legend-item" role="listitem"><span class="chip glow-${g}">${counts[g]}</span><span>${GLOW_NAMES[g]}</span></div>`).join('')}
      </div>
      ${shelves}
    </main>
    ${tabs('book')}`,
    {
      ...tabHandlers,
      word(target) {
        sfx('tap');
        showWord(WORDS.get(target.dataset.w));
      },
    }
  );
  grownupsGate(screen);

  function showWord(word) {
    if (!word) return;
    const glow = glowOf(word.key);
    const voice = speechOn();
    openModal(
      `<p class="eyebrow">${esc(word.unit.name)}</p>
      ${studyTiles(word, 'is-modal')}
      <p class="word-sentence">${clozeHtml(word.sentence, word.key)}</p>
      ${word.tip ? `<p class="tip">${icon('bulb')}<span>${rich(word.tip)}</span></p>` : ''}
      <p class="word-status"><span class="chip glow-${glow}">${GLOW_NAMES[glow]}</span>${glow ? `<span>${esc(whenNext(word.key))}</span>` : ''}</p>
      <div class="modal-actions">
        ${voice ? `<button class="btn btn-ghost" data-act="say">${icon('speaker')} Hear it</button><button class="btn btn-ghost" data-act="sentence">${icon('chat')} In a sentence</button>` : ''}
        <button class="btn btn-main" data-act="close" data-focus>Done</button>
      </div>`,
      {
        say: () => sayWord(word.key),
        sentence: () => saySentence(fullSentence(word.sentence, word.key)),
      },
      { cls: 'modal-word', onClose: stopSpeaking }
    );
    if (voice) sayWord(word.key);
  }

  return { leave: stopSpeaking };
}

function wordsLabel(shelf) {
  const n = shelf.units.reduce((sum, unit) => sum + unit.words.length, 0);
  return `${n} words`;
}
