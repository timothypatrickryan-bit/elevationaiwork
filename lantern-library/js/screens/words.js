// The Firefly Jar: every power word she has met. Practice makes them glow.

import { WORDS } from '../content/index.js';
import { jarWords, dueWords } from '../store.js';
import { jar } from '../art.js';
import { sfx, canSpeak, sayWord } from '../audio.js';
import { mount, esc, topbar, tabs, tabHandlers, openModal, wordCardHtml, plural, grownupsGate } from '../ui.js';
import { go } from '../nav.js';

const GLOW_NAMES = ['New', 'Getting brighter', 'Golden'];

export function open(app) {
  const list = jarWords();
  const due = dueWords();
  const golden = list.filter((w) => w.glow === 2).length;
  const missing = Math.max(0, 4 - list.length);

  let action;
  if (!list.length) action = `<p class="muted">Your jar is empty. Read a chapter and your first fireflies will fly in.</p>`;
  else if (missing) action = `<p class="muted">Catch ${plural(missing, 'more word')} and you can start practicing.</p>`;
  else if (due.length) action = `<button class="btn btn-gold btn-big" data-act="practice">Practice ${plural(Math.min(8, Math.max(4, due.length)), 'word')}</button>`;
  else action = `<p class="muted">All caught up. Your words will be ready to practice again soon.</p><button class="btn btn-soft" data-act="practice">Practice anyway</button>`;

  const cards = list.length
    ? `<p class="legend">${GLOW_NAMES.map((n, i) => `<span class="glow-${i}"><i class="wordcard-dot"></i>${n}</span>`).join('')}</p>
       <div class="wordlist">${list
         .map(
           (w) => `<button class="wordcard glow-${w.glow}" data-act="word" data-word="${esc(w.key)}">
             <span class="wordcard-top"><i class="wordcard-dot"></i><b>${esc(w.word)}</b><span class="wordcard-pos">${esc(w.pos)}</span></span>
             <p>${esc(w.def)}</p>
           </button>`
         )
         .join('')}</div>`
    : `<p class="empty">Underlined words in a story are power words. Tap one while you read, or finish the chapter, and it becomes a firefly here.</p>`;

  const el = mount(
    app,
    'wordspage',
    `${topbar()}
    <main class="scroll">
      <section class="jarhead">
        <div class="jarhead-art">${jar(list.map((w) => w.glow))}</div>
        <div class="jarhead-info">
          <h1 class="display">Firefly Jar</h1>
          <p>Every power word you meet becomes a firefly. Practice a word and it glows brighter. Keep it up and it turns gold.</p>
          <div class="jarhead-stats"><span class="pill"><b>${list.length}</b> of ${WORDS.size} caught</span><span class="pill"><b>${golden}</b> golden</span></div>
          ${action}
        </div>
      </section>
      <h2 class="section-title">Your words</h2>
      ${cards}
    </main>
    ${tabs('words')}`,
    {
      ...tabHandlers,
      practice() {
        sfx('tap');
        go('practice');
      },
      word(target) {
        const w = list.find((x) => x.key === target.dataset.word);
        if (!w) return;
        sfx('tap');
        openModal(
          wordCardHtml(
            w,
            `<p class="wordsheet-from">${GLOW_NAMES[w.glow]} · from “${esc(w.chapterTitle)}” in ${esc(w.bookTitle)}${w.seen ? ` · practiced ${plural(w.seen, 'time')}` : ''}</p>
             <div class="modal-actions"><button class="btn btn-gold" data-act="close">Done</button></div>`,
            canSpeak()
          ),
          { say: () => sayWord(w.word) }
        );
      },
    }
  );

  grownupsGate(el);
}
