// Sound effects (made on the fly, no audio files) and the voice that says the
// words. Speech is the part that varies most between devices, so everything
// here reports honestly whether a word was actually spoken.

import { S } from './store.js';

let ctx = null;

function audio() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, length, opts = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = opts.type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + length);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(opts.gain || 0.1, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  osc.connect(gain);
  gain.connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + length + 0.05);
}

const SOUNDS = {
  key: () => tone(700, 0, 0.045, { type: 'triangle', gain: 0.04 }),
  back: () => tone(420, 0, 0.05, { type: 'triangle', gain: 0.04 }),
  tap: () => tone(520, 0, 0.06, { type: 'triangle', gain: 0.05 }),
  pick: () => tone(660, 0, 0.08, { type: 'triangle', gain: 0.06 }),
  right: () => {
    tone(659.25, 0, 0.12);
    tone(880, 0.09, 0.14);
    tone(1318.5, 0.19, 0.3, { gain: 0.08 });
  },
  fixed: () => {
    tone(587.33, 0, 0.12);
    tone(880, 0.1, 0.26);
  },
  // a slide down and a little pop: silly, not scolding
  fizzle: () => {
    tone(520, 0, 0.32, { type: 'sawtooth', to: 140, gain: 0.05 });
    tone(900, 0.34, 0.06, { type: 'square', gain: 0.04 });
  },
  star: () => {
    tone(987.77, 0, 0.12, { gain: 0.08 });
    tone(1318.5, 0.08, 0.26, { gain: 0.08 });
  },
  jar: () => {
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.4, { gain: 0.085 }));
  },
  buy: () => {
    tone(783.99, 0, 0.1);
    tone(1174.66, 0.08, 0.22);
  },
};

export function sfx(name) {
  if (!S().settings.sound) return;
  try {
    if (SOUNDS[name]) SOUNDS[name]();
  } catch (e) {
    /* sound is a nicety; never let it break the game */
  }
}

// ----------------------------------------------------------------- voice ----

const synth = () => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

export const speechSupported = () => !!synth() && typeof window.SpeechSynthesisUtterance === 'function';

// True when the game should say words aloud: the device can, and the sound
// check (or a grown-up) has said it works.
export const speechOn = () => speechSupported() && S().settings.speak === true;

let run = 0;
const alive = []; // keeps utterances from being collected before they finish

// An iPad only lets a page start talking from inside a tap. Saying nothing,
// silently, on the first tap after the game opens makes sure later words can be
// spoken even when they are not the direct result of a tap.
let primed = false;
let priming = false;
let cancelledAt = 0;

export function primeVoice() {
  if (primed || !speechSupported()) return;
  primed = true;
  try {
    const u = new window.SpeechSynthesisUtterance(' ');
    u.volume = 0;
    const over = () => {
      priming = false;
    };
    u.onend = over;
    u.onerror = over;
    priming = true;
    window.setTimeout(over, 700);
    synth().speak(u);
  } catch (e) {
    priming = false;
  }
}

// Voices to prefer, best first: the standard American voices on Apple
// devices, then the ones Chrome and Edge ship. If none is there, the choice is
// left to the device, which keeps its novelty voices out of the game.
const PREFERRED = [/^samantha/i, /^ava\b/i, /^allison/i, /^susan/i, /^zoe\b/i, /google us english/i, /\b(aria|jenny)\b/i];

function voice() {
  const list = synth().getVoices() || [];
  const us = list.filter((v) => /^en[-_]US/i.test(v.lang));
  for (const name of PREFERRED) {
    const found = us.find((v) => name.test(v.name));
    if (found) return found;
  }
  return us.find((v) => v.default) || null;
}

// Says one or more things in order. Each part is { text, rate }.
// Resolves with 'spoken' when the voice really said it, 'silent' when the
// device never started speaking, or 'stopped' when something else interrupted.
export function speak(parts) {
  return new Promise((resolve) => {
    const s = synth();
    if (!s || !parts.length) return resolve('silent');
    const mine = ++run;
    let started = false;
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const go = () => {
      if (mine !== run) return finish('stopped');
      alive.length = 0;
      parts.forEach((part, i) => {
        const u = new window.SpeechSynthesisUtterance(String(part.text).replace(/[’]/g, "'"));
        const v = voice();
        if (v) u.voice = v;
        u.lang = v ? v.lang : 'en-US';
        u.rate = part.rate || 0.9;
        u.onstart = () => {
          started = true;
        };
        const done = () => {
          if (mine !== run) return finish('stopped');
          if (i === parts.length - 1) finish(started ? 'spoken' : 'silent');
        };
        u.onend = done;
        u.onerror = done;
        alive.push(u);
        s.speak(u);
      });
    };
    // The first speak() has to happen inside the tap itself on an iPad, so
    // only wait when something has to be cancelled first.
    // Speaking straight after a cancel can be swallowed, so leave a short gap.
    const busy = (s.speaking || s.pending) && !priming;
    if (busy) {
      s.cancel();
      cancelledAt = Date.now();
    }
    if (busy || Date.now() - cancelledAt < 120) window.setTimeout(go, 90);
    else go();
    window.setTimeout(() => {
      if (settled) return;
      if (mine !== run) return finish('stopped');
      if (!started) {
        s.cancel();
        finish('silent');
      }
    }, 3500);
  });
}

export function stopSpeaking() {
  run++;
  alive.length = 0;
  const s = synth();
  if (s && (s.speaking || s.pending)) {
    s.cancel();
    cancelledAt = Date.now();
  }
}

// Coming back to the game after it was in the background can leave the voice
// paused; this nudges it awake.
export function wakeVoice() {
  const s = synth();
  if (!s) return;
  try {
    if (s.paused) s.resume();
  } catch (e) {
    /* ignore */
  }
}

// "boat. We rowed the boat across the lake. boat."
export function sayWordInSentence(word, sentence) {
  return speak([
    { text: word, rate: 0.82 },
    { text: sentence, rate: 0.92 },
    { text: word, rate: 0.82 },
  ]);
}

export const sayWord = (word, slow = false) => speak([{ text: word, rate: slow ? 0.5 : 0.82 }]);
export const saySentence = (sentence) => speak([{ text: sentence, rate: 0.92 }]);

// Voices load late on some devices; asking early gets them ready.
if (speechSupported()) {
  try {
    synth().getVoices();
  } catch (e) {
    /* ignore */
  }
}
