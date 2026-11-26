// Supported practice, used before she has to spell a word from memory:
//   fill      the tricky letters are missing and she types them in
//   scramble  all the letters are there, in the wrong order
//   join      a base word and an ending are shown and she types the result
// Each gives two tries, then shows the answer. None of them changes what the
// game believes she knows; only spelling from memory does that.

import { scrambled, pretty } from '../words.js';
import { sfx, speechOn, sayWord, saySentence, stopSpeaking } from '../audio.js';
import { fullSentence } from '../words.js';
import { createKeyboard } from '../keyboard.js';
import { esc, rich, burstFrom } from '../ui.js';
import { frame, tiles, typedTiles, studyTiles, clozeHtml, toolButton } from './parts.js';

// Help while building. With the voice on she can hear the word again. With it
// off she can ask to see the word for a moment, which turns the activity into
// look, cover, write.
function helpTools(f, word, canPeek, repaint) {
  if (speechOn()) {
    f.tools.innerHTML = toolButton('word', 'speaker', 'Word') + toolButton('sentence', 'chat', 'Sentence');
    sayWord(word.key);
    return {
      use: (tool) => (tool === 'sentence' ? saySentence(fullSentence(word.sentence, word.key)) : sayWord(word.key)),
      stop() {},
    };
  }
  if (!canPeek) return { use() {}, stop() {} };
  f.tools.innerHTML = toolButton('peek', 'eye', 'Show me the word');
  let timer = 0;
  return {
    use() {
      window.clearTimeout(timer);
      f.stage.innerHTML = studyTiles(word, 'is-big');
      timer = window.setTimeout(repaint, 2000);
    },
    stop() {
      window.clearTimeout(timer);
    },
  };
}

// ------------------------------------------------------------------- fill ----

export function fill(host, { word, onDone }) {
  const target = word.key;
  const f = frame(host, 'act-fill');
  const slots = Array.from(target).map((ch, i) => (word.hard[i] ? '' : ch));
  const locked = Array.from(target).map((_, i) => !word.hard[i]);
  const wrong = new Set();
  let tries = 0;
  let done = false;
  let gone = false;
  const help = helpTools(f, word, true, () => !gone && paint());

  const nextBlank = () => slots.findIndex((ch, i) => !ch && !locked[i]);
  const lastTyped = () => {
    for (let i = slots.length - 1; i >= 0; i--) if (slots[i] && !locked[i]) return i;
    return -1;
  };

  function paint() {
    if (done) f.stage.innerHTML = studyTiles(word, 'is-right');
    else {
      const cursor = nextBlank();
      const items = [];
      let at = 0;
      word.syl.forEach((syl, s) => {
        if (s > 0) items.push({ gap: true });
        for (let k = 0; k < syl.length; k++) {
          const i = at++;
          let cls = 'is-given';
          if (word.hard[i]) cls = wrong.has(i) ? 'is-bad' : locked[i] ? 'is-ok' : slots[i] ? 'is-filled' : i === cursor ? 'is-blank is-cursor' : 'is-blank';
          items.push({ ch: slots[i], cls });
        }
      });
      f.stage.innerHTML = tiles(items, 'tiles-fill');
    }
    f.cloze.innerHTML = clozeHtml(word.sentence, done ? target : '');
    if (!done) f.enableGo(nextBlank() < 0);
    kb.setEnabled(!done);
  }

  const kb = createKeyboard({
    onKey(k) {
      if (done) return;
      const i = nextBlank();
      if (i < 0) return;
      wrong.clear();
      slots[i] = k;
      sfx('key');
      paint();
    },
    onBack() {
      if (done) return;
      wrong.clear();
      const i = lastTyped();
      if (i < 0) return;
      slots[i] = '';
      sfx('back');
      paint();
    },
    onEnter: () => step(),
  });
  f.kb.appendChild(kb.el);

  function finish(credit) {
    done = true;
    f.setPet(credit === 'missed' ? 'smile' : 'cheer');
    f.setLine(credit === 'missed' ? 'Here it is, with the tricky part colored.' : 'That fits.');
    f.setNote(credit === 'missed' ? (word.tip ? `<span class="tip">${rich(word.tip)}</span>` : 'Take a good look before the next one.') : '<b>Snapped into place!</b>', credit === 'missed' ? 'study' : 'right');
    f.setGo('Next');
    sfx(credit === 'missed' ? 'tap' : credit === 'first' ? 'right' : 'fixed');
    paint();
    if (credit !== 'missed') burstFrom(f.stage.querySelector('.tiles'), 10);
    result = credit;
  }

  let result = '';
  function step() {
    if (gone || !f.goReady()) return;
    if (done) {
      destroy();
      return onDone({ credit: result });
    }
    if (nextBlank() >= 0) return;
    const bad = [];
    slots.forEach((ch, i) => {
      if (ch !== target[i]) bad.push(i);
    });
    if (!bad.length) return finish(tries === 0 ? 'first' : 'second');
    tries++;
    if (tries >= 2) return finish('missed');
    sfx('fizzle');
    slots.forEach((ch, i) => {
      if (word.hard[i] && ch === target[i]) locked[i] = true;
    });
    bad.forEach((i) => wrong.add(i));
    f.setPet('think');
    f.setNote(`Not yet. ${bad.length === 1 ? 'One letter needs' : bad.length + ' letters need'} another look.`, 'fizzle');
    paint();
    // Clear the wrong letters after she has seen which they were.
    window.setTimeout(() => {
      if (gone || done) return;
      bad.forEach((i) => (slots[i] = ''));
      wrong.clear();
      paint();
    }, 900);
  }

  function onClick(event) {
    const tool = event.target.closest('[data-tool]');
    if (tool) {
      if (!done || tool.dataset.tool !== 'peek') help.use(tool.dataset.tool);
      return;
    }
    if (event.target.closest('[data-go]')) step();
  }
  host.addEventListener('click', onClick);

  function destroy() {
    if (gone) return;
    gone = true;
    help.stop();
    host.removeEventListener('click', onClick);
    kb.destroy();
    stopSpeaking();
  }

  f.setLine('Fill in the missing letters.');
  f.setGo('Cast', false);
  paint();
  return { destroy };
}

// --------------------------------------------------------------- scramble ----

export function scramble(host, { word, onDone }) {
  const target = word.key;
  const f = frame(host, 'act-scramble');
  const pool = scrambled(target).map((ch) => ({ ch, used: false }));
  const answer = []; // indexes into pool
  const fixed = []; // answer positions that are locked as right
  let tries = 0;
  let done = false;
  let gone = false;
  let result = '';
  const help = helpTools(f, word, true, () => !gone && paint());

  function paint() {
    if (done) {
      f.stage.innerHTML = studyTiles(word, 'is-right');
      f.kb.innerHTML = '';
    } else {
      const items = [];
      for (let i = 0; i < target.length; i++) {
        if (i < answer.length) items.push({ ch: pool[answer[i]].ch, cls: fixed[i] ? 'is-ok' : 'is-filled' });
        else items.push({ ch: '', cls: i === answer.length ? 'is-blank is-cursor' : 'is-blank' });
      }
      f.stage.innerHTML = tiles(items, 'tiles-fill');
      f.kb.innerHTML = `<div class="pool">${pool
        .map((p, i) => `<button class="key pool-key${p.used ? ' is-used' : ''}" data-pool="${i}"${p.used ? ' disabled' : ''}>${esc(pretty(p.ch))}</button>`)
        .join('')}<button class="key key-wide pool-key" data-pool="back" aria-label="Take the last letter back">⌫</button></div>`;
      f.enableGo(answer.length === target.length);
    }
    f.cloze.innerHTML = clozeHtml(word.sentence, done ? target : '');
  }

  function finish(credit) {
    done = true;
    result = credit;
    f.setPet(credit === 'missed' ? 'smile' : 'cheer');
    f.setLine(credit === 'missed' ? 'Here is the right order.' : 'Unscrambled!');
    f.setNote(credit === 'missed' ? 'Look at how the letters sit together.' : '<b>Every letter in its place.</b>', credit === 'missed' ? 'study' : 'right');
    f.setGo('Next');
    sfx(credit === 'missed' ? 'tap' : credit === 'first' ? 'right' : 'fixed');
    paint();
    if (credit !== 'missed') burstFrom(f.stage.querySelector('.tiles'), 10);
  }

  function step() {
    if (gone || !f.goReady()) return;
    if (done) {
      destroy();
      return onDone({ credit: result });
    }
    if (answer.length < target.length) return;
    const built = answer.map((i) => pool[i].ch).join('');
    if (built === target) return finish(tries === 0 ? 'first' : 'second');
    tries++;
    if (tries >= 2) return finish('missed');
    sfx('fizzle');
    // Keep the letters that are already in the right place; hand the rest back.
    let stillRight = true;
    const keep = [];
    answer.forEach((p, i) => {
      if (stillRight && pool[p].ch === target[i]) {
        keep.push(p);
        fixed[i] = true;
      } else {
        stillRight = false;
        pool[p].used = false;
      }
    });
    answer.length = 0;
    keep.forEach((p) => answer.push(p));
    f.setPet('think');
    f.setNote(keep.length ? 'Not yet. The green letters are in the right place.' : 'Not yet. Listen for the first sound and start again.', 'fizzle');
    paint();
  }

  function onClick(event) {
    const tool = event.target.closest('[data-tool]');
    if (tool) {
      if (!done || tool.dataset.tool !== 'peek') help.use(tool.dataset.tool);
      return;
    }
    if (event.target.closest('[data-go]')) return step();
    const key = event.target.closest('[data-pool]');
    if (!key || done) return;
    if (key.dataset.pool === 'back') {
      if (answer.length && !fixed[answer.length - 1]) {
        pool[answer.pop()].used = false;
        sfx('back');
      }
    } else {
      const i = Number(key.dataset.pool);
      if (pool[i].used || answer.length >= target.length) return;
      pool[i].used = true;
      answer.push(i);
      sfx('key');
    }
    paint();
  }
  host.addEventListener('click', onClick);

  function destroy() {
    if (gone) return;
    gone = true;
    help.stop();
    host.removeEventListener('click', onClick);
    stopSpeaking();
  }

  f.setLine('Put the letters in order.');
  f.setGo('Cast', false);
  paint();
  return { destroy };
}

// ------------------------------------------------------------------- join ----

export function join(host, { word, onDone }) {
  const target = word.key;
  const f = frame(host, 'act-join');
  const sort = word.unit.sort;
  const hint = sort && sort.bins && Number.isInteger(word.bin) ? sort.bins[word.bin] : '';
  let typed = '';
  let tries = 0;
  let done = false;
  let gone = false;
  let result = '';
  const help = helpTools(f, word, false, () => !gone && paint());
  const sum = (answer) => `<p class="sum">${esc(pretty(word.from)).replace(' + ', ' <i>+</i> ')} <i>=</i> ${answer}</p>`;

  function paint() {
    f.stage.innerHTML = done ? sum('') + studyTiles(word, 'is-right') : sum('<span class="sum-q">?</span>') + typedTiles(typed);
    f.cloze.innerHTML = clozeHtml(word.sentence, done ? target : '');
    if (!done) f.enableGo(typed.length > 0);
    kb.setEnabled(!done);
  }

  const kb = createKeyboard({
    onKey(k) {
      if (done || typed.length >= target.length + 4) return;
      typed += k;
      sfx('key');
      paint();
    },
    onBack() {
      if (done) return;
      typed = typed.slice(0, -1);
      sfx('back');
      paint();
    },
    onEnter: () => step(),
  });
  f.kb.appendChild(kb.el);

  function finish(credit) {
    done = true;
    result = credit;
    f.setPet(credit === 'missed' ? 'smile' : 'cheer');
    f.setLine(credit === 'missed' ? 'Here is how they join.' : 'Joined!');
    const why = hint ? ` This one is “${esc(hint)}”.` : '';
    f.setNote(
      credit === 'missed' ? `Look at the colored letters.${why}${word.tip ? ` <span class="tip">${rich(word.tip)}</span>` : ''}` : `<b>A clean join.</b>${why}`,
      credit === 'missed' ? 'study' : 'right'
    );
    f.setGo('Next');
    sfx(credit === 'missed' ? 'tap' : credit === 'first' ? 'right' : 'fixed');
    paint();
    if (credit !== 'missed') burstFrom(f.stage.querySelector('.tiles'), 10);
  }

  function step() {
    if (gone || !f.goReady()) return;
    if (done) {
      destroy();
      return onDone({ credit: result });
    }
    if (!typed) return;
    if (typed === target) return finish(tries === 0 ? 'first' : 'second');
    tries++;
    if (tries >= 2) return finish('missed');
    sfx('fizzle');
    typed = '';
    f.setPet('think');
    f.setNote(`Not yet. ${word.unit.chant ? esc(word.unit.chant) : 'Think about what the rule says.'}`, 'fizzle');
    paint();
  }

  function onClick(event) {
    const tool = event.target.closest('[data-tool]');
    if (tool) {
      if (!done || tool.dataset.tool !== 'peek') help.use(tool.dataset.tool);
      return;
    }
    if (event.target.closest('[data-go]')) step();
  }
  host.addEventListener('click', onClick);

  function destroy() {
    if (gone) return;
    gone = true;
    help.stop();
    host.removeEventListener('click', onClick);
    kb.destroy();
    stopSpeaking();
  }

  f.setLine('Join them into one word.');
  f.setGo('Cast', false);
  paint();
  return { destroy };
}
