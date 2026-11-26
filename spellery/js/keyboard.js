// The game's own keyboard. Using it instead of the iPad's means no
// autocorrect, no word suggestions and no screen jumping about. A real
// keyboard works too.

import { icon } from './art.js';

const ROWS = ['qwertyuiop', 'asdfghjkl', "'zxcvbnm<"];

export function createKeyboard({ onKey, onBack, onEnter }) {
  const el = document.createElement('div');
  el.className = 'kb';
  el.innerHTML = ROWS.map(
    (row, r) =>
      `<div class="kb-row kb-row-${r}">${Array.from(row)
        .map((k) => {
          if (k === '<') return `<button class="key key-wide" data-k="back" aria-label="Delete">${icon('backspace')}</button>`;
          if (k === "'") return `<button class="key key-wide" data-k="'" aria-label="Apostrophe">’</button>`;
          return `<button class="key" data-k="${k}">${k}</button>`;
        })
        .join('')}</div>`
  ).join('');

  let enabled = true;
  let repeat = 0;
  let repeatStart = 0;

  const press = (k) => {
    if (!enabled) return;
    if (k === 'back') onBack();
    else onKey(k);
  };
  const stopRepeat = () => {
    window.clearTimeout(repeatStart);
    window.clearInterval(repeat);
    repeat = 0;
    repeatStart = 0;
  };
  const down = (event) => {
    const key = event.target.closest('.key');
    if (!key || !el.contains(key)) return;
    event.preventDefault();
    key.classList.add('is-down');
    press(key.dataset.k);
    if (key.dataset.k === 'back') {
      stopRepeat();
      repeatStart = window.setTimeout(() => {
        repeat = window.setInterval(() => press('back'), 90);
      }, 420);
    }
  };
  const up = () => {
    stopRepeat();
    el.querySelectorAll('.key.is-down').forEach((k) => k.classList.remove('is-down'));
  };
  const typed = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.backdrop')) return; // a dialog is open
    const k = event.key;
    if (/^[a-zA-Z]$/.test(k)) press(k.toLowerCase());
    else if (k === "'" || k === '’') press("'");
    else if (k === 'Backspace') {
      event.preventDefault();
      press('back');
    } else if (k === 'Enter') {
      event.preventDefault();
      if (onEnter) onEnter();
    }
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  document.addEventListener('keydown', typed);

  return {
    el,
    setEnabled(value) {
      enabled = value;
      el.classList.toggle('is-off', !value);
    },
    destroy() {
      stopRepeat();
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.removeEventListener('keydown', typed);
    },
  };
}
