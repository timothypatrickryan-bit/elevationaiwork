// Pieces the activities share: the frame every activity sits in, letter
// tiles, and the "study" view of a word.

import { pet, icon, FIZZLES, FIZZLE_LINES } from '../art.js';
import { S } from '../store.js';
import { esc, pick } from '../ui.js';
import { pretty } from '../words.js';

export const petHtml = (mood = 'smile', fx = '', cls = '') => pet({ color: S().look.color, wear: S().look.wear, mood, fx, cls });

export const petName = () => S().profile.pet || 'Your familiar';

// A random spell-gone-wrong, with the sentence that describes it.
export function fizzle() {
  const fx = pick(FIZZLES);
  return { fx, line: `${petName()} ${FIZZLE_LINES[fx]}!` };
}

const GO_GUARD = 400; // milliseconds

// Builds the common layout and returns handles to its parts.
export function frame(host, cls = '') {
  host.innerHTML = `<div class="act ${cls}">
    <div class="act-head">
      <div class="act-pet"></div>
      <div class="act-say">
        <p class="act-line"></p>
        <div class="act-tools"></div>
        <p class="act-cloze"></p>
      </div>
    </div>
    <div class="act-stage"></div>
    <div class="act-note" aria-live="polite"></div>
    <div class="act-go"></div>
    <div class="act-kb"></div>
  </div>`;
  const q = (sel) => host.querySelector(sel);
  let goAt = 0;
  const parts = {
    root: q('.act'),
    pet: q('.act-pet'),
    line: q('.act-line'),
    tools: q('.act-tools'),
    cloze: q('.act-cloze'),
    stage: q('.act-stage'),
    note: q('.act-note'),
    go: q('.act-go'),
    kb: q('.act-kb'),
    setPet(mood, fx = '') {
      parts.pet.innerHTML = petHtml(mood, fx, mood === 'cheer' ? 'is-cheer' : '');
    },
    setLine(text) {
      parts.line.textContent = text;
    },
    setNote(html, kind = '') {
      parts.note.className = 'act-note' + (kind ? ' is-' + kind : '');
      parts.note.innerHTML = html;
    },
    // The one big button under the tiles. A button that appears ready to
    // press ignores presses for a moment, so a double tap on "Cast" cannot
    // also press the "Next" that replaces it and skip what the game has to say.
    setGo(label, enabled = true, kind = 'btn-main') {
      const guard = !!label && enabled;
      parts.go.innerHTML = label ? `<button class="btn ${kind} btn-big${guard ? ' is-fresh' : ''}" data-go${enabled ? '' : ' disabled'}>${esc(label)}</button>` : '';
      goAt = guard ? Date.now() : 0;
      const b = parts.go.querySelector('[data-go]');
      if (b && guard) window.setTimeout(() => b.classList.remove('is-fresh'), GO_GUARD);
    },
    goReady: () => Date.now() - goAt >= GO_GUARD,
    enableGo(enabled) {
      const b = parts.go.querySelector('[data-go]');
      if (b) b.disabled = !enabled;
    },
  };
  parts.setPet('smile');
  return parts;
}

// One row of letter tiles. items = [{ ch, cls }]; an empty ch draws a blank.
export function tiles(items, cls = '') {
  const n = Math.max(items.length, 1);
  return `<div class="tiles ${cls}" style="--n:${n}">${items
    .map((it) => (it.gap ? '<span class="tile-gap" aria-hidden="true"></span>' : `<span class="tile ${it.cls || ''}">${it.ch ? esc(pretty(it.ch)) : '&nbsp;'}</span>`))
    .join('')}</div>`;
}

// What she has typed so far, with a cursor at the end.
export function typedTiles(typed, cls = '') {
  const items = Array.from(typed).map((ch) => ({ ch }));
  items.push({ ch: '', cls: 'is-cursor' });
  return tiles(items, 'tiles-typed ' + cls);
}

// The word shown for study: syllables set slightly apart, tricky letters colored.
export function studyTiles(word, cls = '') {
  const items = [];
  let at = 0;
  word.syl.forEach((syl, s) => {
    if (s > 0) items.push({ gap: true });
    for (const ch of syl) {
      items.push({ ch, cls: word.hard[at] ? 'is-hard' : 'is-plain' });
      at++;
    }
  });
  return tiles(items, 'tiles-study ' + cls);
}

// "We rowed the ____ across the lake." with the blank filled in when `shown` is given.
export function clozeHtml(sentence, shown = '') {
  const [before, after] = String(sentence).split('*');
  const gap = shown ? `<b class="cloze-word">${esc(pretty(shown))}</b>` : '<span class="cloze-gap" aria-label="blank"></span>';
  return esc(before) + gap + esc(after || '');
}

export const toolButton = (act, iconName, label) => `<button class="tool" data-tool="${act}">${icon(iconName)}<span>${esc(label)}</span></button>`;

// A word with one blank for each tricky group, as shown on sort cards: bla__
export function blanked(word) {
  let out = '';
  let i = 0;
  while (i < word.key.length) {
    const g = word.groups.find((x) => x.from === i);
    if (g) {
      out += '<span class="card-blank"></span>';
      i = g.to;
    } else {
      out += esc(pretty(word.key[i]));
      i++;
    }
  }
  return out;
}
