// One book: its cover, its blurb, and a lantern for each chapter.

import { BOOKS, findBook } from '../content/index.js';
import { S, starsOf, isDone, bookUnlocked, chapterUnlocked, bookProgress } from '../store.js';
import { icon, lantern, cover, stars } from '../art.js';
import { sfx } from '../audio.js';
import { mount, esc, rich, topbar, partLabel, plural } from '../ui.js';
import { go } from '../nav.js';

export function open(app, params) {
  const book = findBook(params.id);
  const bookIndex = BOOKS.indexOf(book);
  if (!book || !bookUnlocked(bookIndex)) return go('home');
  const p = bookProgress(book);
  const session = S().session;
  const upNext = book.chapters.findIndex((c, i) => !isDone(c.id) && chapterUnlocked(bookIndex, i));
  const noun = book.kind === 'fiction' ? 'chapter' : 'part';

  const rows = book.chapters
    .map((c, i) => {
      const done = isDone(c.id);
      const open = chapterUnlocked(bookIndex, i);
      const halfway = session && session.chapterId === c.id;
      const cls = ['chapter'];
      if (done) cls.push('is-done');
      if (i === upNext) cls.push('is-next');
      if (!open) cls.push('is-locked');
      const side = open
        ? `${done ? stars(starsOf(c.id)) : ''}<button class="btn ${done && !halfway ? 'btn-soft' : 'btn-gold'}" data-act="read" data-id="${c.id}"${halfway ? ' data-resume="1"' : ''}>${halfway ? 'Continue' : done ? 'Read again' : 'Read'}</button>`
        : `${icon('lock')}<span>Finish ${partLabel(book, i - 1).toLowerCase()} first</span>`;
      return `<li class="${cls.join(' ')}">
        <span class="chapter-lantern">${lantern(starsOf(c.id))}</span>
        <span class="chapter-main">
          <span class="chapter-num">${partLabel(book, i)}</span>
          <span class="chapter-title">${esc(c.title)}</span>
          ${open ? `<span class="chapter-teaser">${rich(c.teaser)}</span>` : ''}
        </span>
        <span class="chapter-side">${side}</span>
      </li>`;
    })
    .join('');

  const el = mount(
    app,
    'bookpage',
    `${topbar(book.title)}
    <main class="scroll">
      <section class="bookhead">
        <div class="cover">${cover(book.cover)}</div>
        <div class="bookhead-info">
          <p class="eyebrow">${esc(book.genre)} · ${plural(book.chapters.length, noun)}</p>
          <h1 class="display">${esc(book.title)}</h1>
          <p class="bookhead-blurb">${rich(book.blurb)}</p>
          <p class="bookhead-meta"><span class="star is-on">${icon('star')}</span><span>${p.stars} of ${p.maxStars} stars · ${p.lit} of ${p.total} lanterns lit</span></p>
        </div>
      </section>
      <ol class="chapters">${rows}</ol>
    </main>`,
    {
      back() {
        sfx('tap');
        go('home');
      },
      read(target) {
        sfx('tap');
        go('reader', { chapterId: target.dataset.id, resume: !!target.dataset.resume });
      },
    }
  );
  el.dataset.hue = book.hue;
}
