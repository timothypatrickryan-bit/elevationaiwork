// The library: a string of lanterns showing overall progress, Glim's
// suggestion for what to read next, and the shelf of books.

import { BOOKS, TOTAL_LANTERNS, findChapter } from '../content/index.js';
import { S, starsOf, lanternsLit, bookUnlocked, lanternsNeeded, bookProgress, nextUp, dueWords } from '../store.js';
import { icon, lantern, glim, cover } from '../art.js';
import { sfx } from '../audio.js';
import { mount, esc, topbar, tabs, tabHandlers, toast, grownupsGate, plural } from '../ui.js';
import { go } from '../nav.js';

let garlands = 0;

// A sagging string of lanterns: one swag per book, one lantern per chapter.
function garland(books, width, cls, nextId) {
  const gid = 'garland' + ++garlands;
  const glows = books
    .map(
      (book) => `<radialGradient id="${gid}-${book.hue}">
        <stop offset="0" style="stop-color:var(--hue-${book.hue});stop-opacity:.6"/>
        <stop offset=".5" style="stop-color:var(--hue-${book.hue});stop-opacity:.2"/>
        <stop offset="1" style="stop-color:var(--hue-${book.hue});stop-opacity:0"/>
      </radialGradient>`
    )
    .join('');
  const swag = width / books.length;
  const top = 8;
  const sag = 20;
  let string = '';
  let pegs = `<circle class="garland-peg" cx="0" cy="${top}" r="3"/>`;
  let lanterns = '';
  books.forEach((book, k) => {
    const x0 = k * swag;
    string += `M${x0.toFixed(1)} ${top}Q${(x0 + swag / 2).toFixed(1)} ${top + sag * 2} ${(x0 + swag).toFixed(1)} ${top}`;
    pegs += `<circle class="garland-peg" cx="${(x0 + swag).toFixed(1)}" cy="${top}" r="3"/>`;
    const n = book.chapters.length;
    book.chapters.forEach((ch, i) => {
      const t = (i + 1) / (n + 1);
      const x = x0 + swag * t;
      const y = top + 4 * sag * t * (1 - t);
      const s = starsOf(ch.id);
      lanterns += `<g class="gl${s ? ' is-lit' : ''}${ch.id === nextId ? ' is-next' : ''}" data-hue="${book.hue}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(1.3)">
        <circle class="gl-halo" cy="21" r="${20 + s * 4}" fill="url(#${gid}-${book.hue})"/>
        <path class="garland-string" d="M0 0v7"/>
        <path class="gl-cap" d="M-5 7h10l2.500 4h-15z"/>
        <rect class="gl-body" x="-8" y="11" width="16" height="21" rx="4"/>
        <rect class="gl-cap" x="-5.500" y="32" width="11" height="3" rx="1.500"/>
      </g>`;
    });
  });
  return `<svg class="garland ${cls}" viewBox="-8 0 ${width + 16} 84" aria-hidden="true"><defs>${glows}</defs><path class="garland-string" d="${string}"/>${pegs}${lanterns}</svg>`;
}

function bookCard(book, bookIndex) {
  const open = bookUnlocked(bookIndex);
  const p = bookProgress(book);
  const cls = ['bookcard'];
  if (!open) cls.push('is-locked');
  if (p.complete) cls.push('is-complete');
  const body = open
    ? `<span class="bookcard-lanterns">${book.chapters.map((c) => lantern(starsOf(c.id))).join('')}</span>
       <span class="bookcard-meta">${p.lit ? `${p.lit} of ${p.total} lit · ${icon('star')} ${p.stars}` : plural(p.total, book.kind === 'fiction' ? 'chapter' : 'part')}</span>`
    : `<span class="bookcard-lock">${icon('lock')} Light ${plural(lanternsNeeded(bookIndex), 'more lantern')}</span>`;
  return `<button class="${cls.join(' ')}" data-act="book" data-id="${book.id}" data-hue="${book.hue}" aria-label="${esc(book.title)}${open ? '' : ', locked'}">
    <span class="cover">${cover(book.cover)}</span>
    <span class="bookcard-body">
      <span class="bookcard-genre">${esc(book.genre)}</span>
      <span class="bookcard-title">${esc(book.title)}</span>
      ${body}
    </span>
  </button>`;
}

export function open(app) {
  const st = S();
  const lit = lanternsLit();
  const up = nextUp();
  const session = st.session && findChapter(st.session.chapterId) ? st.session : null;
  const halfway = session ? findChapter(session.chapterId) : null;
  const name = st.profile.name;
  const due = dueWords().length;

  let hello = name ? `Welcome back, ${name}.` : 'Welcome back.';
  let say;
  let cta = '';
  if (halfway) {
    say = `You stopped partway through “${halfway.chapter.title}.” Your place is saved.`;
    cta = `<button class="btn btn-gold btn-big" data-act="resume">Pick up where you left off</button>`;
  } else if (lit === 0) {
    hello = name ? `Hello, ${name}.` : 'Hello, reader.';
    say = 'Two books are open on the shelf. Choose one, or let me pick, and we’ll light your first lantern.';
    cta = `<button class="btn btn-gold btn-big" data-act="continue">Start reading</button>`;
  } else if (up) {
    say = `Next up: “${up.chapter.title}” in ${up.book.title}.`;
    cta = `<button class="btn btn-gold btn-big" data-act="continue">Keep reading</button>`;
  } else {
    say = 'Every lantern is lit! Reread any chapter to make its lantern shine brighter.';
  }
  const nextId = halfway ? halfway.chapter.id : up ? up.chapter.id : '';

  const el = mount(
    app,
    'home',
    `${topbar()}
    <main class="scroll">
      <section class="hero">
        ${garland(BOOKS, 1000, 'garland-wide', nextId)}
        ${garland(BOOKS.slice(0, 3), 500, 'garland-narrow', nextId)}
        ${garland(BOOKS.slice(3), 500, 'garland-narrow', nextId)}
        <div class="hero-row">
          <div class="hero-glim">${glim({ glow: st.glim.glow, wear: st.glim.wear, mood: lit === TOTAL_LANTERNS ? 'cheer' : 'smile' })}</div>
          <div class="hero-talk">
            <h1 class="hero-hello">${esc(hello)}</h1>
            <p class="hero-say">${esc(say)}</p>
            <div class="hero-cta">${cta}<span class="hero-count"><b>${lit}</b> of ${TOTAL_LANTERNS} lanterns lit</span>
              ${due >= 4 ? `<button class="chip-btn" data-act="words">${icon('jar')} ${plural(due, 'word')} ready to practice</button>` : ''}</div>
          </div>
        </div>
      </section>
      <h2 class="section-title">The shelf</h2>
      <div class="shelf">${BOOKS.map(bookCard).join('')}</div>
    </main>
    ${tabs('home')}`,
    {
      ...tabHandlers,
      continue() {
        sfx('tap');
        if (up) go('reader', { chapterId: up.chapter.id });
      },
      resume() {
        sfx('tap');
        go('reader', { chapterId: session.chapterId, resume: true });
      },
      words() {
        sfx('tap');
        go('words');
      },
      book(target) {
        const bookIndex = BOOKS.findIndex((b) => b.id === target.dataset.id);
        if (!bookUnlocked(bookIndex)) {
          sfx('almost');
          return toast(`Light ${plural(lanternsNeeded(bookIndex), 'more lantern')} to open this book.`, 'lock');
        }
        sfx('tap');
        go('book', { id: target.dataset.id });
      },
    }
  );

  grownupsGate(el);
}
