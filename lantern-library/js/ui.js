// Small pieces every screen shares: the top bar, the tabs, dialogs, toasts.

import { icon, lantern } from './art.js';
import { S, streakNow, readToday } from './store.js';
import { escapeHtml, inlineHtml } from './text.js';
import { sfx } from './audio.js';
import { go } from './nav.js';

export const esc = escapeHtml;
export const rich = inlineHtml;

export const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');

// Stories have chapters; collections of articles, tales and poems have parts.
export const partLabel = (book, index) => (book.kind === 'fiction' ? 'Chapter ' : 'Part ') + (index + 1);

export function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Puts a fresh screen into the app and routes clicks on [data-act] elements
// to the matching handler.
export function mount(app, className, html, handlers = {}) {
  const el = document.createElement('div');
  el.className = 'screen ' + className;
  el.innerHTML = html;
  app.appendChild(el);
  wire(el, handlers);
  return el;
}

export function wire(el, handlers) {
  el.addEventListener('click', (event) => {
    const target = event.target.closest('[data-act]');
    if (!target || !el.contains(target) || target.disabled) return;
    const fn = handlers[target.dataset.act];
    if (fn) fn(target, event);
  });
}

export function statsHtml() {
  const st = S();
  const streak = streakNow();
  return `<span class="stat stat-streak${readToday() ? '' : ' is-cold'}" title="Days in a row">${icon('flame')}<span>${streak}</span><span class="sr">day streak</span></span>
    <span class="stat stat-sparks" title="Sparks">${icon('spark')}<span data-sparks>${st.sparks}</span><span class="sr">sparks</span></span>`;
}

export function topbar(title, opts = {}) {
  if (!title) {
    return `<header class="topbar">
      <div class="brand">${lantern(3)}<span class="brand-name">Lantern Library</span></div>
      <div class="stats">${statsHtml()}<button class="chip-btn hold" data-act="grownups" aria-label="For grown-ups: press and hold">${icon('people')}<span class="chip-label">Grown-ups</span></button></div>
    </header>`;
  }
  return `<header class="topbar">
    <button class="icon-btn" data-act="back" aria-label="Back">${icon('back')}</button>
    <h1 class="topbar-title">${esc(title)}</h1>
    <div class="stats">${opts.right !== undefined ? opts.right : statsHtml()}</div>
  </header>`;
}

const TABS = [
  ['home', 'Library', () => lantern(2)],
  ['words', 'Firefly Jar', () => icon('jar')],
  ['glimshop', 'Glim', () => icon('wand')],
  ['badges', 'Badges', () => icon('badge')],
];

export function tabs(active) {
  return `<nav class="tabs" aria-label="Sections">${TABS.map(
    ([id, label, art]) => `<button class="tab" data-act="tab" data-tab="${id}"${id === active ? ' aria-current="page"' : ''}>${art()}<span>${label}</span></button>`
  ).join('')}</nav>`;
}

export const tabHandlers = {
  tab(target) {
    sfx('tap');
    go(target.dataset.tab);
  },
};

// ---------------------------------------------------------------- layers ----

const openLayers = new Set();

export function closeLayers() {
  for (const close of Array.from(openLayers)) close();
}

export function openModal(html, handlers = {}, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'backdrop';
  wrap.innerHTML = `<div class="modal ${opts.cls || ''}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(wrap);
  const close = () => {
    if (!openLayers.has(close)) return;
    openLayers.delete(close);
    wrap.remove();
    if (opts.onClose) opts.onClose();
  };
  openLayers.add(close);
  wrap.addEventListener('click', (event) => {
    if (event.target === wrap) return opts.sticky ? null : close();
    const target = event.target.closest('[data-act]');
    if (!target || target.disabled) return;
    if (target.dataset.act === 'close') return close();
    const fn = handlers[target.dataset.act];
    if (fn) fn(target, close, wrap);
  });
  const first = wrap.querySelector('[data-focus]') || wrap.querySelector('button');
  if (first && opts.focus !== false) first.focus({ preventScroll: true });
  return { el: wrap, close };
}

// A yes/no question as a dialog. Resolves true or false.
export function ask({ title, body, yes, no = 'Not now', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    openModal(
      `<h2>${esc(title)}</h2>${body ? `<p>${body}</p>` : ''}
       <div class="modal-actions">
         <button class="btn btn-ghost" data-act="no">${esc(no)}</button>
         <button class="btn ${danger ? 'btn-danger' : 'btn-gold'}" data-act="yes" data-focus>${esc(yes)}</button>
       </div>`,
      {
        yes(_, close) {
          answered = true;
          close();
          resolve(true);
        },
        no(_, close) {
          answered = true;
          close();
          resolve(false);
        },
      },
      { onClose: () => !answered && resolve(false) }
    );
  });
}

let popoverClose = null;

// A small card that floats next to the thing that was tapped.
export function openPopover(anchor, html, handlers = {}, opts = {}) {
  closePopover();
  const pop = document.createElement('div');
  pop.className = 'popover ' + (opts.cls || '');
  pop.setAttribute('role', 'dialog');
  pop.innerHTML = html;
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth;
  const h = pop.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.max(12, Math.min(vw - w - 12, r.left + r.width / 2 - w / 2));
  let top = r.bottom + 10;
  if (top + h > vh - 12) top = r.top - h - 10;
  if (top < 12) top = Math.max(12, vh - h - 12);
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';

  const outside = (event) => {
    if (!pop.contains(event.target)) close();
  };
  const close = () => {
    if (!openLayers.has(close)) return;
    openLayers.delete(close);
    document.removeEventListener('pointerdown', outside, true);
    pop.remove();
    if (popoverClose === close) popoverClose = null;
    if (opts.onClose) opts.onClose();
  };
  openLayers.add(close);
  popoverClose = close;
  // Wait a tick so the tap that opened it does not also close it.
  window.setTimeout(() => openLayers.has(close) && document.addEventListener('pointerdown', outside, true), 0);
  pop.addEventListener('click', (event) => {
    const target = event.target.closest('[data-act]');
    if (!target || target.disabled) return;
    if (target.dataset.act === 'close') return close();
    const fn = handlers[target.dataset.act];
    if (fn) fn(target, close, pop);
  });
  return { el: pop, close };
}

export function closePopover() {
  if (popoverClose) popoverClose();
}

let toastTimer = 0;

export function toast(message, iconName = 'spark') {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = icon(iconName) + `<span>${esc(message)}</span>`;
  document.body.appendChild(el);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.classList.add('is-out');
    window.setTimeout(() => el.remove(), 320);
  }, 2600);
}

// A puff of sparks at a point on the screen.
export function burst(x, y, count = 14) {
  const el = document.createElement('div');
  el.className = 'spark-burst';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const far = 50 + Math.random() * 70;
    const dot = document.createElement('i');
    dot.style.setProperty('--dx', Math.cos(angle) * far + 'px');
    dot.style.setProperty('--dy', Math.sin(angle) * far + 'px');
    el.appendChild(dot);
  }
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 900);
}

export function burstFrom(el, count) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, count);
}

// Press-and-hold: calls onDone after `ms` of holding. A quick tap calls onTap.
export function holdToOpen(el, onDone, onTap, ms = 1200) {
  if (!el) return;
  let timer = 0;
  let done = false;
  const cancel = () => {
    window.clearTimeout(timer);
    timer = 0;
    el.classList.remove('is-holding');
  };
  el.addEventListener('pointerdown', () => {
    done = false;
    el.classList.add('is-holding');
    timer = window.setTimeout(() => {
      done = true;
      cancel();
      onDone();
    }, ms);
  });
  el.addEventListener('pointerup', cancel);
  el.addEventListener('pointerleave', cancel);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('click', () => {
    if (!done && onTap) onTap();
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDone();
    }
  });
}

// The Grown-ups button on the main screens: press and hold to open.
export function grownupsGate(screen) {
  holdToOpen(
    screen.querySelector('[data-act="grownups"]'),
    () => go('grownups'),
    () => toast('Grown-ups: press and hold this button.', 'people')
  );
}

export function shortDate(time) {
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// The definition card for a power word, shared by the reader and the jar.
export function wordCardHtml(w, extra = '', withVoice = true) {
  const example = esc(w.ex).replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  return `<div class="popover-top"><div><div class="wordsheet-word">${esc(w.word)}</div><div class="wordsheet-pos">${esc(w.pos)}</div></div>
      ${withVoice ? `<button class="icon-btn" data-act="say" aria-label="Hear the word">${icon('speaker')}</button>` : ''}</div>
    <p class="wordsheet-def">${esc(w.def)}</p>
    <p class="wordsheet-ex">${example}</p>${extra}`;
}
