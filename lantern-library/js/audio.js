// Sound effects (made on the fly, no audio files) and the read-aloud voice.

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
  gain.gain.exponentialRampToValueAtTime(opts.gain || 0.11, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  osc.connect(gain);
  gain.connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + length + 0.05);
}

const SOUNDS = {
  tap: () => tone(520, 0, 0.06, { type: 'triangle', gain: 0.05 }),
  pick: () => tone(660, 0, 0.08, { type: 'triangle', gain: 0.06 }),
  place: () => tone(440, 0, 0.08, { gain: 0.07 }),
  right: () => {
    tone(659.25, 0, 0.14);
    tone(880, 0.1, 0.24);
  },
  almost: () => {
    tone(330, 0, 0.16, { type: 'triangle', gain: 0.08 });
    tone(277.18, 0.13, 0.22, { type: 'triangle', gain: 0.07 });
  },
  star: () => {
    tone(987.77, 0, 0.12, { gain: 0.08 });
    tone(1318.5, 0.08, 0.26, { gain: 0.08 });
  },
  lantern: () => {
    tone(196, 0, 0.55, { to: 392, gain: 0.08 });
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.28 + i * 0.1, 0.42, { gain: 0.09 }));
  },
  buy: () => {
    tone(783.99, 0, 0.1);
    tone(1174.66, 0.08, 0.22);
  },
  catch: () => {
    tone(1174.66, 0, 0.08, { gain: 0.07 });
    tone(1567.98, 0.06, 0.18, { gain: 0.07 });
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

export const canSpeak = () => !!synth() && typeof window.SpeechSynthesisUtterance === 'function';

let run = 0; // increases whenever speaking is stopped or restarted
let current = null; // keeps the utterance alive until it finishes

function voice() {
  const list = synth().getVoices() || [];
  const english = list.filter((v) => /^en[-_]US/i.test(v.lang));
  const pool = english.length ? english : list.filter((v) => /^en/i.test(v.lang));
  return pool.find((v) => /samantha|ava|allison|zoe|jenny|aria/i.test(v.name)) || pool.find((v) => v.localService) || pool[0] || null;
}

// What the voice should say for a piece of passage text: no italics markers,
// no "(say by-oh-...)" pronunciation helps.
export function spoken(text) {
  return String(text)
    .replace(/\*/g, '')
    .replace(/\s*\(say [^)]*\)/g, '')
    .replace(/—/g, ', ');
}

// Speaks a list of { id, text } one after another. onUnit(id) fires as each
// starts; onDone(finished) fires at the end (finished = false if it was
// stopped or the voice never started).
export function speakUnits(units, onUnit, onDone) {
  const s = synth();
  if (!s || !units.length) return onDone && onDone(false);
  const mine = ++run;
  let started = false;
  let i = 0;
  if (s.speaking || s.pending) s.cancel();
  const next = () => {
    if (mine !== run) return;
    if (i >= units.length) return onDone && onDone(true);
    const unit = units[i];
    const u = new window.SpeechSynthesisUtterance(spoken(unit.text));
    const v = voice();
    if (v) u.voice = v;
    u.lang = v ? v.lang : 'en-US';
    u.rate = 0.92;
    u.onstart = () => {
      started = true;
      if (mine === run && onUnit) onUnit(unit.id);
    };
    u.onend = u.onerror = () => {
      if (mine !== run) return;
      i++;
      next();
    };
    current = u;
    s.speak(u);
  };
  // The first speak() has to happen inside the tap itself, or iPad Safari
  // stays silent, so there is no delay here.
  next();
  window.setTimeout(() => {
    if (mine === run && !started && !s.speaking) {
      run++;
      s.cancel();
      if (onDone) onDone(false);
    }
  }, 3500);
}

export function stopSpeaking() {
  run++;
  current = null;
  const s = synth();
  if (s) s.cancel();
}

export function sayWord(word) {
  if (!canSpeak()) return;
  speakUnits([{ id: 'word', text: word }], null, null);
}
