// Small pieces every screen shares: the top bar, the tabs, dialogs, toasts.

import { icon } from './art.js';
import { S, streakNow, playedToday } from './store.js';
import { sfx } from './audio.js';
import { go } from './nav.js';

export function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Escapes, then turns *marked* letters into highlights.
export const rich = (text) => esc(text).replace(/\*([^*]+)\*/g, '<b class="hl">$1</b>');

export const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');

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

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Puts a fresh screen into the app and routes taps on [data-act] elements to
// the matching handler.
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
  return `<span class="stat stat-streak${playedToday() ? '' : ' is-cold'}" title="Days in a row">${icon('flame')}<span>${streakNow()}</span><span class="sr">day streak</span></span>
    <span class="stat stat-sparks" title="Sparks">${icon('spark')}<span data-sparks>${st.sparks}</span><span class="sr">sparks</span></span>`;
}

export function topbar(title, opts = {}) {
  if (!title) {
    return `<header class="topbar">
      <div class="brand"><span class="brand-mark">${icon('wand')}</span><span class="brand-name">The Spellery</span></div>
      <div class="stats">${statsHtml()}<button class="chip-btn hold" data-act="grownups" aria-label="For grown-ups: press and hold">${icon('people')}<span class="chip-label">Grown-ups</span></button></div>
    </header>`;
  }
  return `<header class="topbar">
    <button class="icon-btn" data-act="back" aria-label="Back">${icon('back')}</button>
    <h1 class="topbar-title">${esc(title)}</h1>
    <div class="stats">${opts.right !== undefined ? opts.right : statsHtml()}</div>
  </header>`;
}

export function tabs(active) {
  const list = [
    ['home', 'Workshop', 'jar'],
    ['book', 'Spellbook', 'book'],
    ['petshop', S().profile.pet || 'Familiar', 'paw'],
    ['badges', 'Badges', 'badge'],
  ];
  return `<nav class="tabs" aria-label="Sections">${list
    .map(([id, label, art]) => `<button class="tab" data-act="tab" data-tab="${id}"${id === active ? ' aria-current="page"' : ''}>${icon(art)}<span>${esc(label)}</span></button>`)
    .join('')}</nav>`;
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
         <button class="btn ${danger ? 'btn-danger' : 'btn-main'}" data-act="yes" data-focus>${esc(yes)}</button>
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

// A puff of sparks (or of gray smoke, for a fizzle) at a point on the screen.
export function burst(x, y, count = 14, cls = '') {
  const el = document.createElement('div');
  el.className = 'spark-burst ' + cls;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const far = 46 + Math.random() * 70;
    const dot = document.createElement('i');
    dot.style.setProperty('--dx', Math.cos(angle) * far + 'px');
    dot.style.setProperty('--dy', Math.sin(angle) * far + 'px');
    el.appendChild(dot);
  }
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 900);
}

export function burstFrom(el, count, cls) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, count, cls);
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
