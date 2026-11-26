// Sound: effects and music made on the fly, and Blip's recorded voice.
//
// Effects and music are built from simple tones and hiss (no sound files).
// Blip's voice is a set of recordings in audio/ (see tools/make-voice.py);
// they play through an ordinary <audio> element, the same way a song or a
// video does, so they are heard even when an iPad is on silent.
//
// An iPad only lets a page make sound after a tap. main.js calls unlockAudio()
// on the first tap, and everything here stays quiet until then.

import { S } from './store.js';

const hasWindow = typeof window !== 'undefined';
let ctx = null;
let out = null; // effects
let tune = null; // music
let hiss = null; // one second of noise, reused by every effect that needs it
let unlocked = false;

function audio() {
  if (!hasWindow) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -14;
    limit.ratio.value = 6;
    limit.connect(ctx.destination);
    out = ctx.createGain();
    out.gain.value = 0.55;
    out.connect(limit);
    tune = ctx.createGain();
    tune.gain.value = 0;
    tune.connect(limit);
    hiss = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = hiss.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1664525 + 1013904223) | 0;
      data[i] = (seed / 2147483648) * 0.9;
    }
  }
  if (ctx.state !== 'running' && unlocked) ctx.resume().catch(() => {});
  return ctx;
}

// ---- waking the sound up on the first tap

// Effects and music would be muted by an iPad's silent mode. Newer iPads let a
// page say what kind of sound it makes; older ones treat the page as "media"
// for as long as an <audio> element is playing, so a silent one is kept
// looping in the background.
let keepAwake = null;
function silentLoop() {
  const rate = 8000;
  const n = rate / 2;
  const bytes = new Uint8Array(44 + n);
  const view = new DataView(bytes.buffer);
  const text = (at, s) => [...s].forEach((ch, i) => view.setUint8(at + i, ch.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + n, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, 'data');
  view.setUint32(40, n, true);
  bytes.fill(128, 44);
  return window.URL.createObjectURL(new window.Blob([bytes], { type: 'audio/wav' }));
}

export function unlockAudio() {
  if (!hasWindow) return;
  const first = !unlocked;
  unlocked = true;
  const a = audio();
  if (a && a.state !== 'running') a.resume().catch(() => {});
  if (!first) return;
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
    else if (typeof window.Audio === 'function') {
      keepAwake = new window.Audio(silentLoop());
      keepAwake.loop = true;
      keepAwake.setAttribute('x-webkit-airplay', 'deny');
      const p = keepAwake.play();
      if (p && p.catch) p.catch(() => {});
    }
  } catch (e) {
    /* not available; sound still works when the iPad is not on silent */
  }
  if (player) {
    try {
      player.src = SILENCE;
      const started = player.play();
      if (started && started.catch) {
        started.catch((e) => {
          if (e && e.name === 'NotAllowedError') unlocked = false;
        });
      }
    } catch (e) {
      unlocked = false;
    }
  }
  setMusic(wanted);
}

// The game is hidden (another app, the Home Screen): everything goes quiet.
export function sleepAudio(asleep) {
  if (ctx && unlocked) {
    if (asleep) ctx.suspend().catch(() => {});
    else ctx.resume().catch(() => {});
  }
  if (keepAwake) {
    if (asleep) keepAwake.pause();
    else {
      const p = keepAwake.play();
      if (p && p.catch) p.catch(() => {});
    }
  }
  if (asleep) stopSpeaking();
}

// ---- effects

function tone(type, f0, f1, at, length, peak, { attack = 0.005, dest = out, curve = 'exp' } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, at);
  if (f1 !== f0) {
    if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + length);
    else o.frequency.linearRampToValueAtTime(f1, at + length);
  }
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + length);
  o.connect(g);
  g.connect(dest);
  o.start(at);
  o.stop(at + length + 0.02);
}

function rush(at, length, peak, f0, f1, { type = 'lowpass', q = 0.8, dest = out, attack = 0.004 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = hiss;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(f0, at);
  filter.frequency.exponentialRampToValueAtTime(Math.max(30, f1), at + length);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + length);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(at, (at * 7.3) % 0.9);
  src.stop(at + length + 0.02);
}

const NOTE = (n) => 440 * Math.pow(2, n / 12); // semitones from the A above middle C

const SOUNDS = {
  tap: (t) => tone('triangle', 900, 1300, t, 0.05, 0.12),
  laser: (t) => {
    tone('sawtooth', 1500, 280, t, 0.14, 0.16);
    tone('square', 2200, 500, t, 0.07, 0.05);
  },
  boom: (t) => {
    rush(t, 0.45, 0.6, 2400, 120);
    tone('sine', 150, 42, t, 0.38, 0.5);
  },
  bigboom: (t) => {
    rush(t, 1.1, 0.75, 3000, 70);
    tone('sine', 120, 30, t, 0.9, 0.7);
    rush(t + 0.12, 0.6, 0.35, 5000, 400, { type: 'bandpass', q: 1.5 });
  },
  clang: (t) => {
    tone('square', 240, 180, t, 0.22, 0.14);
    tone('square', 317, 250, t, 0.22, 0.1);
    rush(t, 0.08, 0.2, 6000, 2000, { type: 'bandpass', q: 3 });
  },
  hurt: (t) => {
    rush(t, 0.35, 0.5, 1200, 90);
    tone('sawtooth', 130, 50, t, 0.3, 0.3);
  },
  gem: (t, n = 0) => tone('sine', NOTE(12 + Math.min(n, 12)), NOTE(12 + Math.min(n, 12)) * 1.02, t, 0.09, 0.13),
  right: (t) => [0, 4, 7].forEach((n, i) => tone('triangle', NOTE(3 + n), NOTE(3 + n), t + i * 0.055, 0.16, 0.14)),
  streak: (t) => [0, 4, 7, 12].forEach((n, i) => tone('triangle', NOTE(5 + n), NOTE(5 + n), t + i * 0.05, 0.14, 0.13)),
  warp: (t) => rush(t, 0.5, 0.25, 300, 5000, { type: 'bandpass', q: 2, attack: 0.25 }),
  warn: (t) => [0, 0.16].forEach((d) => tone('square', 990, 990, t + d, 0.09, 0.08)),
  plasma: (t) => tone('sawtooth', 320, 110, t, 0.25, 0.12),
  shield: (t) => tone('sine', 700, 1500, t, 0.3, 0.12, { curve: 'lin' }),
  scan: (t) => [0, 0.07, 0.14].forEach((d, i) => tone('sine', 1200 + i * 300, 1200 + i * 300, t + d, 0.06, 0.1)),
  nova: (t) => {
    rush(t, 0.5, 0.3, 200, 6000, { type: 'bandpass', q: 1, attack: 0.4 });
    rush(t + 0.45, 1.2, 0.8, 4000, 60);
    tone('sine', 200, 30, t + 0.45, 1.0, 0.7);
  },
  tick: (t) => tone('square', 1400, 1400, t, 0.03, 0.05),
  bossHit: (t) => {
    rush(t, 0.5, 0.55, 1800, 80);
    tone('sawtooth', 90, 45, t, 0.5, 0.35);
    tone('square', 60, 40, t, 0.4, 0.25);
  },
  roar: (t) => {
    tone('sawtooth', 70, 110, t, 0.7, 0.3, { attack: 0.2, curve: 'lin' });
    tone('sawtooth', 73, 116, t, 0.7, 0.3, { attack: 0.2, curve: 'lin' });
    rush(t, 0.7, 0.2, 300, 900, { type: 'bandpass', q: 4, attack: 0.3 });
  },
  medal: (t) => [0, 4, 7, 12, 16].forEach((n, i) => tone('triangle', NOTE(n), NOTE(n), t + i * 0.11, i === 4 ? 0.6 : 0.2, 0.16)),
  rank: (t) => [0, 5, 7, 12, 17, 19, 24].forEach((n, i) => tone('triangle', NOTE(n - 2), NOTE(n - 2), t + i * 0.09, i === 6 ? 0.8 : 0.18, 0.15)),
  buy: (t) => [7, 12, 19].forEach((n, i) => tone('sine', NOTE(n), NOTE(n), t + i * 0.07, 0.2, 0.14)),
  no: (t) => tone('square', 180, 140, t, 0.16, 0.09),
  down: (t) => {
    tone('sawtooth', 500, 60, t, 1.0, 0.25);
    rush(t + 0.2, 0.9, 0.4, 1500, 60);
  },
  link: (t, n = 0) => tone('triangle', NOTE(n * 2), NOTE(n * 2 + 5), t, 0.12, 0.14),
};

export function sfx(name, arg) {
  if (!unlocked || S().settings.sfx === false) return;
  const a = audio();
  if (!a || !SOUNDS[name]) return;
  try {
    SOUNDS[name](a.currentTime + 0.005, arg);
  } catch (e) {
    /* a sound that fails must never stop the game */
  }
}

// ---- music
//
// Four chords in A minor, played as a soft bass, a pad and a plucked pattern.
// Every note belongs to the same scale, so nothing can clash.

const CHORDS = [
  [-12, [0, 3, 7]], // A minor
  [-16, [0, 4, 7]], // F
  [-9, [0, 4, 7]], // C
  [-14, [0, 4, 7]], // G
];
const MODES = {
  map: { bpm: 76, pluck: [0, 6, 10], pattern: [0, 2, 1], level: 0.07, kick: false },
  battle: { bpm: 100, pluck: [0, 3, 6, 8, 11, 14], pattern: [0, 1, 2, 1, 0, 2], level: 0.075, kick: true },
  boss: { bpm: 124, pluck: [0, 2, 4, 6, 8, 10, 12, 14], pattern: [0, 2, 1, 2, 0, 2, 1, 2], level: 0.085, kick: true },
};
let wanted = 'off';
let playing = 'off';
let musicTimer = 0;
let nextStep = 0;
let step = 0;

function playStep(mode, n, at) {
  const m = MODES[mode];
  const len = 60 / m.bpm / 4;
  const bar = Math.floor(n / 16);
  const s = n % 16;
  const [root, triad] = CHORDS[Math.floor(bar / 2) % 4];
  if (s === 0 && bar % 2 === 0) {
    // the pad: root and fifth held for two bars
    for (const semis of [root, root + 7, root + 12 + triad[1]]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = NOTE(semis);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(0.5, at + len * 6);
      g.gain.linearRampToValueAtTime(0.0001, at + len * 32);
      o.connect(g);
      g.connect(tune);
      o.start(at);
      o.stop(at + len * 32 + 0.05);
    }
  }
  if (s === 0 || s === 8) tone('triangle', NOTE(root - 12), NOTE(root - 12), at, len * 5, 0.9, { dest: tune, attack: 0.02 });
  if (m.kick && (s === 0 || s === 8)) tone('sine', 120, 45, at, 0.16, 0.9, { dest: tune });
  if (mode === 'boss' && s % 4 === 2) rush(at, 0.04, 0.25, 9000, 7000, { type: 'highpass', dest: tune });
  const hit = m.pluck.indexOf(s);
  if (hit >= 0) {
    const semis = root + 12 + triad[m.pattern[hit % m.pattern.length]] + (hit % 4 === 3 ? 12 : 0);
    tone('sine', NOTE(semis), NOTE(semis), at, len * 2.4, 0.7, { dest: tune, attack: 0.01 });
  }
}

function pump() {
  if (!ctx || playing === 'off') return;
  const len = 60 / MODES[playing].bpm / 4;
  if (nextStep < ctx.currentTime) nextStep = ctx.currentTime + 0.05;
  while (nextStep < ctx.currentTime + 0.3) {
    try {
      playStep(playing, step, nextStep);
    } catch (e) {
      /* skip the step */
    }
    nextStep += len;
    step++;
  }
}

// 'map', 'battle', 'boss' or 'off'. Asking again for what is already playing
// changes nothing, so screens can simply say what they want.
export function setMusic(mode) {
  wanted = mode;
  const on = unlocked && S().settings.music !== false && mode !== 'off';
  const target = on ? mode : 'off';
  if (target === playing) return;
  const a = on ? audio() : ctx;
  if (!a) return;
  window.clearInterval(musicTimer);
  const now = a.currentTime;
  tune.gain.cancelScheduledValues(now);
  tune.gain.setValueAtTime(tune.gain.value, now);
  if (target === 'off') {
    tune.gain.linearRampToValueAtTime(0, now + 0.4);
    playing = 'off';
    return;
  }
  tune.gain.linearRampToValueAtTime(MODES[target].level, now + 0.6);
  playing = target;
  step = 0;
  nextStep = now + 0.1;
  musicTimer = window.setInterval(pump, 90);
  pump();
}
export const refreshMusic = () => setMusic(wanted);

function duck(down) {
  if (!ctx || playing === 'off') return;
  const now = ctx.currentTime;
  tune.gain.cancelScheduledValues(now);
  tune.gain.setValueAtTime(tune.gain.value, now);
  tune.gain.linearRampToValueAtTime(MODES[playing].level * (down ? 0.35 : 1), now + 0.25);
}

// ---- Blip's voice

const player = hasWindow && typeof window.Audio === 'function' ? new window.Audio() : null;
if (player) player.preload = 'auto';
// a moment of silence, used to start the player from inside the first tap
const SILENCE = 'data:audio/mpeg;base64,//MkxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//MkxCMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//MkxEYAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MkxGkAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MkxIwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MkxK8AAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MkxNIAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MkxNwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MkxNwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

let index = null; // { packs: [name], clips: { text: [pack, offset, length] } }
let indexAsked = null;
const packs = new Map(); // pack name -> promise of its bytes
let run = 0; // goes up whenever something new is said or speech is stopped
let settle = null; // ends the line now playing
const listeners = new Set(); // told when Blip starts and stops talking

export const onSpeaking = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const tell = (on) => listeners.forEach((fn) => fn(on));

export const voiceOn = () => !!player && S().settings.voice !== false;

// A recording is found by the words it says.
export const clipKey = (text) => String(text).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

export function loadVoice() {
  if (!indexAsked) {
    indexAsked = window
      .fetch('audio/index.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        index = data && data.clips ? data : null;
        return index;
      })
      .catch(() => {
        indexAsked = null; // offline for now; ask again next time
        return null;
      });
  }
  return indexAsked;
}
export function resetVoice() {
  index = null;
  indexAsked = null;
  packs.clear();
}
function loadPack(name) {
  if (!packs.has(name)) {
    const asked = window
      .fetch(`audio/${name}.bin`)
      .then((r) => {
        if (!r.ok) throw new Error('no pack');
        return r.arrayBuffer();
      })
      .catch((e) => {
        packs.delete(name);
        throw e;
      });
    packs.set(name, asked);
  }
  return packs.get(name);
}
function clipAddress(bytes, offset, length) {
  const view = new Uint8Array(bytes, offset, length);
  let text = '';
  for (let i = 0; i < view.length; i += 0x2000) text += String.fromCharCode.apply(null, view.subarray(i, i + 0x2000));
  return 'data:audio/mpeg;base64,' + window.btoa(text);
}

// Fetches ahead of time the recordings for these lines, so that the first one
// does not have to wait.
export function prepareVoice(texts) {
  if (!voiceOn()) return;
  loadVoice().then((idx) => {
    if (!idx) return;
    const names = new Set();
    for (const text of texts) {
      const at = idx.clips[clipKey(text)];
      if (at) names.add(idx.packs[at[0]]);
    }
    names.forEach((name) => loadPack(name).catch(() => {}));
  });
}

// Says one line, or several one after another. Resolves 'spoken' when the last
// one ends, 'silent' if there is no recording or the voice is off, 'stopped' if
// something else was said first. The words are always on screen as well, so a
// silent line loses nothing but the sound.
export function speak(lines) {
  const texts = (Array.isArray(lines) ? lines : [lines]).filter(Boolean);
  stopSpeaking();
  if (!voiceOn() || !unlocked || !texts.length) return Promise.resolve('silent');
  const mine = ++run;
  return new Promise((resolve) => {
    let done = false;
    let started = false;
    let watchdog = 0;
    let at = 0;
    let clips = [];
    const finish = (value) => {
      if (done) return;
      done = true;
      window.clearTimeout(watchdog);
      if (settle === stop) settle = null;
      if (player.onended === onEnded) {
        player.onended = null;
        player.onerror = null;
        player.onplaying = null;
      }
      if (started) {
        tell(false);
        duck(false);
      }
      resolve(value);
    };
    const stop = () => finish('stopped');
    settle = stop;
    const onPlaying = () => {
      if (!started) {
        started = true;
        tell(true);
        duck(true);
      }
    };
    const onEnded = () => {
      if (mine !== run) return finish('stopped');
      window.setTimeout(next, 180);
    };
    const onError = () => finish(mine !== run ? 'stopped' : started ? 'spoken' : 'silent');
    function next() {
      if (mine !== run) return finish('stopped');
      if (at >= clips.length) return finish('spoken');
      if (!started) {
        window.clearTimeout(watchdog);
        watchdog = window.setTimeout(() => finish(mine !== run ? 'stopped' : started ? 'spoken' : 'silent'), 3500);
      }
      player.dataset.clip = clipKey(texts[at]);
      player.src = clips[at++];
      const p = player.play();
      if (p && p.catch) {
        p.catch((e) => {
          if (mine !== run) return finish('stopped');
          if (!started && e && e.name === 'NotAllowedError') finish('silent');
        });
      }
    }
    watchdog = window.setTimeout(() => finish(mine !== run ? 'stopped' : 'silent'), 12000);
    loadVoice()
      .then((idx) => {
        if (!idx) throw new Error('no index');
        const where = texts.map((text) => idx.clips[clipKey(text)]);
        if (where.some((spot) => !spot)) throw new Error('no clip');
        return Promise.all(where.map((spot) => loadPack(idx.packs[spot[0]]).then((bytes) => clipAddress(bytes, spot[1], spot[2]))));
      })
      .then((ready) => {
        if (done) return;
        if (mine !== run) return finish('stopped');
        clips = ready;
        player.onplaying = onPlaying;
        player.onended = onEnded;
        player.onerror = onError;
        next();
      })
      .catch(() => finish(mine !== run ? 'stopped' : 'silent'));
  });
}

export function stopSpeaking() {
  run++;
  if (settle) settle();
  if (player && !player.paused) {
    try {
      player.pause();
    } catch (e) {
      /* nothing was playing */
    }
  }
}
