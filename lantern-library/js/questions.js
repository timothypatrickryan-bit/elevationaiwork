// The six kinds of question. Each maker returns a small controller:
//
//   html        markup to put inside the question area
//   mount(el)   start listening for taps
//   ready()     has she given a complete answer?
//   check()     -> { ok, note }   note = a short "2 of 4 are right" style message
//   afterMiss() keep what was right, clear what was wrong, for the second try
//   reveal()    show the full correct answer and lock everything
//   destroy()   stop listening
//
// env = { page, units, changed(), marks(ids) }  where page is the story element.

import { icon } from './art.js';
import { sfx } from './audio.js';
import { rich, esc, shuffle } from './ui.js';
import { unitsMatching, plain } from './text.js';

const LETTERS = 'ABCDEF';

function shuffledNotSame(n) {
  const base = Array.from({ length: n }, (_, i) => i);
  let order = shuffle(base);
  for (let tries = 0; tries < 6 && order.every((v, i) => v === i); tries++) order = shuffle(base);
  return order;
}

// ------------------------------------------------------- multiple choice ----

function mc(q, env) {
  const order = shuffle(q.choices.map((_, i) => i));
  let picked = null;
  let root = null;
  let locked = false;
  const buttons = () => Array.from(root.querySelectorAll('.choice'));
  const onClick = (event) => {
    const b = event.target.closest('.choice');
    if (!b || b.disabled || locked) return;
    picked = Number(b.dataset.c);
    sfx('pick');
    for (const x of buttons()) {
      const on = Number(x.dataset.c) === picked;
      x.classList.toggle('is-picked', on);
      x.setAttribute('aria-checked', on ? 'true' : 'false');
    }
    env.changed();
  };
  return {
    html: `<div class="choices" role="radiogroup">${order
      .map(
        (c, k) => `<button class="choice" role="radio" aria-checked="false" data-c="${c}"><span class="choice-key">${LETTERS[k]}</span><span class="choice-text">${rich(q.choices[c])}</span></button>`
      )
      .join('')}</div>`,
    mount(el) {
      root = el;
      root.addEventListener('click', onClick);
    },
    ready: () => picked !== null,
    check: () => ({ ok: picked === q.answer, note: '' }),
    afterMiss() {
      const b = buttons().find((x) => Number(x.dataset.c) === picked);
      if (b) {
        b.classList.remove('is-picked');
        b.classList.add('is-wrong');
        b.disabled = true;
        b.setAttribute('aria-checked', 'false');
      }
      picked = null;
    },
    reveal() {
      locked = true;
      for (const b of buttons()) {
        const right = Number(b.dataset.c) === q.answer;
        b.disabled = true;
        b.classList.remove('is-picked');
        b.classList.toggle('is-right', right);
        if (right) b.querySelector('.choice-key').innerHTML = icon('check');
        else if (!b.classList.contains('is-wrong')) b.classList.add('is-dim');
      }
    },
    destroy() {
      if (root) root.removeEventListener('click', onClick);
    },
  };
}

// ------------------------------------------------------------ choose two ----

function multi(q, env) {
  const order = shuffle(q.choices.map((_, i) => i));
  const need = q.answers.length;
  const picked = new Set();
  const kept = new Set(); // right picks carried over from the first try
  let root = null;
  let locked = false;
  const buttons = () => Array.from(root.querySelectorAll('.choice'));
  const count = () => picked.size + kept.size;
  const paint = () => {
    for (const b of buttons()) {
      const c = Number(b.dataset.c);
      b.classList.toggle('is-picked', picked.has(c));
      b.setAttribute('aria-checked', picked.has(c) || kept.has(c) ? 'true' : 'false');
    }
    root.querySelector('.widget-note').textContent = `${count()} of ${need} chosen`;
  };
  const onClick = (event) => {
    const b = event.target.closest('.choice');
    if (!b || b.disabled || locked) return;
    const c = Number(b.dataset.c);
    if (picked.has(c)) picked.delete(c);
    else if (count() >= need) {
      b.classList.remove('shake');
      void b.offsetWidth;
      b.classList.add('shake');
      return;
    } else picked.add(c);
    sfx('pick');
    paint();
    env.changed();
  };
  return {
    html: `<div class="choices" role="group">${order
      .map(
        (c, k) => `<button class="choice" role="checkbox" aria-checked="false" data-c="${c}"><span class="choice-key">${LETTERS[k]}</span><span class="choice-text">${rich(q.choices[c])}</span></button>`
      )
      .join('')}</div><p class="widget-note">0 of ${need} chosen</p>`,
    mount(el) {
      root = el;
      root.addEventListener('click', onClick);
    },
    ready: () => count() === need,
    check() {
      const all = [...picked, ...kept];
      const right = all.filter((c) => q.answers.includes(c)).length;
      return { ok: right === need, note: `${right} of your ${need} choices ${right === 1 ? 'is' : 'are'} right.` };
    },
    afterMiss() {
      for (const b of buttons()) {
        const c = Number(b.dataset.c);
        if (!picked.has(c)) continue;
        b.classList.remove('is-picked');
        b.disabled = true;
        if (q.answers.includes(c)) {
          kept.add(c);
          b.classList.add('is-right');
          b.querySelector('.choice-key').innerHTML = icon('check');
        } else b.classList.add('is-wrong');
      }
      picked.clear();
      paint();
    },
    reveal() {
      locked = true;
      for (const b of buttons()) {
        const c = Number(b.dataset.c);
        const right = q.answers.includes(c);
        b.disabled = true;
        b.classList.remove('is-picked');
        b.classList.toggle('is-right', right);
        if (right) b.querySelector('.choice-key').innerHTML = icon('check');
        else if (!b.classList.contains('is-wrong')) b.classList.add('is-dim');
      }
      root.querySelector('.widget-note').textContent = '';
    },
    destroy() {
      if (root) root.removeEventListener('click', onClick);
    },
  };
}

// ------------------------------------------------------ tap the sentence ----

function evidence(q, env) {
  const answers = new Set();
  for (const quote of q.answer) for (const id of unitsMatching(env.units, quote)) answers.add(id);
  const tried = new Set();
  const unitWord = env.poem ? 'line' : 'sentence';
  let picked = null;
  let root = null;
  let locked = false;
  const unitEl = (id) => env.page.querySelector(`.u[data-u="${id}"]`);
  const box = () => root.querySelector('.pickbox');
  const show = (text, state) => {
    const b = box();
    b.className = 'pickbox ' + state;
    b.querySelector('.pickbox-quote').textContent = text;
  };
  const onPick = (event) => {
    if (locked) return;
    const u = event.target.closest('.u');
    if (!u || !env.page.contains(u)) return;
    const id = u.dataset.u;
    if (tried.has(id)) return;
    if (picked) unitEl(picked).classList.remove('is-picked');
    picked = id;
    u.classList.add('is-picked');
    sfx('pick');
    show(plain(env.units.find((x) => x.id === id).text), 'is-filled');
    env.changed();
  };
  return {
    html: `<div class="pickbox is-empty"><span class="pickbox-label">Your ${unitWord}</span><span class="pickbox-quote">Tap a ${unitWord} in the story.</span></div>`,
    mount(el) {
      root = el;
      env.page.classList.add('picking');
      env.page.addEventListener('click', onPick);
    },
    ready: () => picked !== null,
    check: () => ({ ok: answers.has(picked), note: '' }),
    afterMiss() {
      const u = unitEl(picked);
      u.classList.remove('is-picked');
      u.classList.add('is-wrong');
      tried.add(picked);
      picked = null;
      show(`Not that one. Tap a different ${unitWord}.`, 'is-empty');
    },
    reveal() {
      locked = true;
      env.page.classList.remove('picking');
      env.page.querySelectorAll('.u.is-picked, .u.is-wrong').forEach((u) => u.classList.remove('is-picked', 'is-wrong'));
      const best = picked && answers.has(picked) ? picked : Array.from(answers)[0];
      root.querySelector('.pickbox-label').textContent = 'The evidence';
      show(plain(env.units.find((x) => x.id === best).text), 'is-right');
    },
    // The sentences to light up when the answer is explained.
    answerIds: () => Array.from(answers),
    destroy() {
      env.page.classList.remove('picking');
      env.page.removeEventListener('click', onPick);
      env.page.querySelectorAll('.u.is-picked, .u.is-wrong').forEach((u) => u.classList.remove('is-picked', 'is-wrong'));
    },
  };
}

// ---------------------------------------------------------- put in order ----

function order(q, env) {
  const n = q.items.length;
  const bank = shuffledNotSame(n); // item numbers, in the order the cards are shown
  const slots = new Array(n).fill(null); // slot -> item number
  const fixed = new Array(n).fill(false);
  let root = null;
  let locked = false;
  const paint = () => {
    const placed = new Set(slots.filter((v) => v !== null));
    const open = slots.indexOf(null);
    // Only the next empty place is drawn, so the list never gets longer than
    // the number of cards plus one.
    const slotsHtml = slots
      .map((item, s) => {
        if (item === null) {
          if (s !== open) return '';
          return `<div class="slot"><span class="slot-n">${s + 1}</span><span class="slot-empty">Tap what happened ${s === 0 ? 'first' : s === n - 1 ? 'last' : 'next'}</span></div>`;
        }
        return `<button class="slot is-filled${fixed[s] ? ' is-right' : ''}" data-slot="${s}"${fixed[s] || locked ? ' disabled' : ''} aria-label="Position ${s + 1}: ${esc(plain(q.items[item]))}. Tap to take it back."><span class="slot-n">${fixed[s] ? icon('check') : s + 1}</span><span>${rich(q.items[item])}</span></button>`;
      })
      .join('');
    const left = bank.filter((item) => !placed.has(item));
    root.innerHTML = `<div class="slots">${slotsHtml}</div>${left.length ? `<div class="bank">${left.map((item) => `<button class="card" data-item="${item}">${rich(q.items[item])}</button>`).join('')}</div>` : ''}`;
  };
  const onClick = (event) => {
    if (locked) return;
    const card = event.target.closest('.card');
    const slot = event.target.closest('.slot.is-filled');
    if (card) {
      const s = slots.indexOf(null);
      if (s < 0) return;
      slots[s] = Number(card.dataset.item);
      sfx('place');
    } else if (slot && !slot.disabled) {
      slots[Number(slot.dataset.slot)] = null;
      sfx('tap');
    } else return;
    paint();
    env.changed();
  };
  return {
    html: '',
    mount(el) {
      root = el;
      paint();
      root.addEventListener('click', onClick);
    },
    ready: () => slots.every((v) => v !== null),
    check() {
      const right = slots.filter((v, s) => v === s).length;
      return { ok: right === n, note: `${right} of ${n} ${right === 1 ? 'is' : 'are'} in the right place.` };
    },
    afterMiss() {
      slots.forEach((v, s) => {
        if (v === s) fixed[s] = true;
        else slots[s] = null;
      });
      paint();
    },
    reveal() {
      locked = true;
      for (let s = 0; s < n; s++) {
        slots[s] = s;
        fixed[s] = true;
      }
      paint();
    },
    destroy() {
      if (root) root.removeEventListener('click', onClick);
    },
  };
}

// ------------------------------------------------------- sort into groups ----

function sort(q, env) {
  const n = q.items.length;
  const shown = shuffle(q.items.map((_, i) => i));
  const choice = new Array(n).fill(null);
  const fixed = new Array(n).fill(false);
  let root = null;
  let locked = false;
  const paint = () => {
    root.innerHTML = shown
      .map((i) => {
        const cls = ['sort-item'];
        if (fixed[i]) cls.push('is-right');
        return `<div class="${cls.join(' ')}" data-item="${i}"><p>${rich(q.items[i].t)}</p><div class="seg" role="radiogroup">${q.bins
          .map((b, bi) => `<button class="seg-btn${choice[i] === bi ? ' is-picked' : ''}" role="radio" aria-checked="${choice[i] === bi}" data-item="${i}" data-bin="${bi}"${fixed[i] || locked ? ' disabled' : ''}>${rich(b)}</button>`)
          .join('')}</div></div>`;
      })
      .join('');
  };
  const onClick = (event) => {
    if (locked) return;
    const b = event.target.closest('.seg-btn');
    if (!b || b.disabled) return;
    const i = Number(b.dataset.item);
    choice[i] = Number(b.dataset.bin);
    sfx('pick');
    // Repaint just this item so the list does not jump.
    const item = b.closest('.sort-item');
    item.classList.remove('is-retry');
    item.querySelectorAll('.seg-btn').forEach((x) => {
      const on = Number(x.dataset.bin) === choice[i];
      x.classList.toggle('is-picked', on);
      x.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    env.changed();
  };
  return {
    html: '',
    mount(el) {
      root = el;
      paint();
      root.addEventListener('click', onClick);
    },
    ready: () => choice.every((c) => c !== null),
    check() {
      const right = choice.filter((c, i) => c === q.items[i].bin).length;
      return { ok: right === n, note: `${right} of ${n} are in the right group.` };
    },
    afterMiss() {
      const again = [];
      choice.forEach((c, i) => {
        if (c === q.items[i].bin) fixed[i] = true;
        else {
          choice[i] = null;
          again.push(i);
        }
      });
      paint();
      for (const i of again) root.querySelector(`.sort-item[data-item="${i}"]`).classList.add('is-retry');
    },
    reveal() {
      locked = true;
      q.items.forEach((item, i) => {
        choice[i] = item.bin;
        fixed[i] = true;
      });
      paint();
    },
    destroy() {
      if (root) root.removeEventListener('click', onClick);
    },
  };
}

// ----------------------------------------------------- finish the summary ----

function cloze(q, env) {
  const words = shuffle([...q.blanks, ...q.extra]);
  const n = q.blanks.length;
  const filled = new Array(n).fill(null); // blank -> index into words
  const fixed = new Array(n).fill(false);
  let active = 0;
  let root = null;
  let locked = false;
  const parts = q.text.split(/\[(\d)\]/); // text, "1", text, "2", ...
  const paint = () => {
    const used = new Set(filled.filter((v) => v !== null));
    const text = parts
      .map((part, k) => {
        if (k % 2 === 0) return rich(part);
        const b = Number(part) - 1;
        const cls = ['blank'];
        if (fixed[b]) cls.push('is-right');
        else if (filled[b] !== null) cls.push('is-filled');
        else if (b === active) cls.push('is-active');
        const label = filled[b] !== null ? esc(words[filled[b]]) : String(b + 1);
        return `<button class="${cls.join(' ')}" data-blank="${b}"${fixed[b] || locked ? ' disabled' : ''} aria-label="Blank ${b + 1}${filled[b] !== null ? ': ' + esc(words[filled[b]]) : ''}">${label}</button>`;
      })
      .join('');
    root.innerHTML = `<p class="cloze-text">${text}</p><div class="chips">${words
      .map((w, i) => `<button class="chip${used.has(i) ? ' is-used' : ''}" data-word="${i}"${used.has(i) || locked ? ' disabled' : ''}>${esc(w)}</button>`)
      .join('')}</div>`;
  };
  const nextEmpty = () => filled.findIndex((v) => v === null);
  const onClick = (event) => {
    if (locked) return;
    const chip = event.target.closest('.chip');
    const blank = event.target.closest('.blank');
    if (chip && !chip.disabled) {
      if (active < 0 || filled[active] !== null) active = nextEmpty();
      if (active < 0) return;
      filled[active] = Number(chip.dataset.word);
      active = nextEmpty();
      sfx('place');
    } else if (blank && !blank.disabled) {
      const b = Number(blank.dataset.blank);
      filled[b] = null;
      active = b;
      sfx('tap');
    } else return;
    paint();
    env.changed();
  };
  return {
    html: '',
    mount(el) {
      root = el;
      paint();
      root.addEventListener('click', onClick);
    },
    ready: () => filled.every((v) => v !== null),
    check() {
      const right = filled.filter((v, b) => v !== null && words[v] === q.blanks[b]).length;
      return { ok: right === n, note: `${right} of ${n} ${right === 1 ? 'blank is' : 'blanks are'} right.` };
    },
    afterMiss() {
      filled.forEach((v, b) => {
        if (v !== null && words[v] === q.blanks[b]) fixed[b] = true;
        else filled[b] = null;
      });
      active = nextEmpty();
      paint();
    },
    reveal() {
      locked = true;
      q.blanks.forEach((word, b) => {
        filled[b] = words.indexOf(word);
        fixed[b] = true;
      });
      active = -1;
      paint();
    },
    destroy() {
      if (root) root.removeEventListener('click', onClick);
    },
  };
}

const MAKERS = { mc, multi, evidence, order, sort, cloze };

export function makeWidget(q, env) {
  return MAKERS[q.type](q, env);
}

// A one-line instruction shown under the question for the less obvious kinds.
export function howTo(q, poem) {
  if (q.type === 'evidence') return `Tap a ${poem ? 'line' : 'sentence'} in the story, then check.`;
  if (q.type === 'order') return 'Tap the cards in the order things happened.';
  if (q.type === 'sort') return 'Choose a group for each one.';
  if (q.type === 'cloze') return 'Tap a word to drop it into the glowing blank.';
  return '';
}
