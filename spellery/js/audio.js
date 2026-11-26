// Sound effects (made on the fly, no audio files) and the voice that says the
// words (recordings in audio/). Sound is the part that varies most between
// devices, so everything here reports honestly whether a word was actually said.

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
// The words are spoken by recordings that ship with the game (audio/, made by
// tools/make-voice.py). They play through an ordinary <audio> element, the same
// way a song or a video does, so they are heard even when an iPad is on
// silent. The device's own speech voice is only a stand-in for anything that
// has no recording; on an iPad that voice is muted by silent mode.
//
// A clip is found by the text it speaks, with "~" in front for a slow word.

const player = typeof window !== 'undefined' && typeof window.Audio === 'function' ? new window.Audio() : null;
if (player) player.preload = 'auto';

const synth = () => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);
const deviceVoice = () => !!synth() && typeof window.SpeechSynthesisUtterance === 'function';

// Can this device say words at all?
export const speechSupported = () => !!player || deviceVoice();

// True when the game should say words aloud: it can, and the sound check (or a
// grown-up) has said they are heard.
export const speechOn = () => speechSupported() && S().settings.speak === true;

let run = 0; // goes up whenever something new is said or speech is stopped
let gapTimer = 0;

// ---- recordings

let index = null; // { packs: [name], clips: { text: [pack, offset, length] } }
let indexAsked = null;
const packs = new Map(); // pack name -> promise of its bytes

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

// Forgets what was fetched, so the next word asks again. Used when a new
// version of the game takes over, in case its recordings differ.
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

const clipKey = (part) =>
  (part.slow ? '~' : '') +
  String(part.text)
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

// The clip as an address the <audio> element can play straight away: a data:
// address normally, or a blob: address as a second way in, should a browser
// refuse the first.
function clipAddress(bytes, offset, length, asBlob) {
  const view = new Uint8Array(bytes, offset, length);
  if (asBlob) return window.URL.createObjectURL(new window.Blob([view], { type: 'audio/mpeg' }));
  let text = '';
  for (let i = 0; i < view.length; i += 0x2000) text += String.fromCharCode.apply(null, view.subarray(i, i + 0x2000));
  return 'data:audio/mpeg;base64,' + window.btoa(text);
}

// Fetches ahead of time the recordings for these words, so the first word of a
// jar does not have to wait for them.
export function prepareVoice(texts) {
  if (!player) return;
  loadVoice().then((idx) => {
    if (!idx) return;
    const wanted = new Set();
    for (const text of texts) {
      const at = idx.clips[clipKey({ text })];
      if (at) wanted.add(idx.packs[at[0]]);
    }
    wanted.forEach((name) => loadPack(name).catch(() => {}));
  });
}

// An iPad only lets a page make sound once the player has been started from
// inside a tap. Playing a moment of silence on the first tap does that, and
// from then on the game can speak whenever it needs to.
const SILENCE = 'data:audio/mpeg;base64,//MkxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//MkxCMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//MkxEYAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MkxGkAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MkxIwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MkxK8AAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MkxNIAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MkxNwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MkxNwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
let unlocked = false;

export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  audio(); // the sound effects need the same wake-up
  if (!player) return;
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

// Sound effects are made on the fly and would be muted by an iPad's silent
// mode. Where the browser lets a page say what kind of sound it makes, tell it
// this is something the player means to hear, like a video.
try {
  if (typeof navigator !== 'undefined' && navigator.audioSession) navigator.audioSession.type = 'playback';
} catch (e) {
  /* not available; the recorded voice does not need it */
}

// Plays the recordings for these parts, one after another. Resolves like speak().
let endRecorded = null; // settles the sequence now playing, if any

function playRecorded(parts, mine) {
  return new Promise((resolve) => {
    let settled = false;
    let started = false;
    let watchdog = 0;
    const onPlaying = () => {
      started = true;
    };
    const onEnded = () => {
      if (mine !== run) return finish('stopped');
      // a short breath between the word and its sentence
      gapTimer = window.setTimeout(next, 260);
    };
    const onError = () => {
      if (mine !== run) return finish('stopped');
      if (started) return finish('spoken');
      // Nothing has played yet. Offer the same recordings the other way once.
      if (!asBlob && spots.length) {
        asBlob = true;
        clips = spots.map((spot) => clipAddress(spot.bytes, spot.offset, spot.length, true));
        at = 0;
        return next();
      }
      finish('silent');
    };
    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(watchdog);
      if (endRecorded === stop) endRecorded = null;
      // leave the player alone if a newer sequence has already taken it over
      if (player.onended === onEnded) {
        player.onended = null;
        player.onerror = null;
        player.onplaying = null;
      }
      resolve(value);
    };
    const stop = () => finish('stopped');
    endRecorded = stop;

    let clips = [];
    let spots = [];
    let asBlob = false;
    let at = 0;
    function next() {
      if (mine !== run) return finish('stopped');
      if (at >= clips.length) return finish('spoken');
      if (!started) {
        // The recordings are in hand. If the player still has not started a
        // few seconds from now, it is not going to.
        window.clearTimeout(watchdog);
        watchdog = window.setTimeout(() => finish(mine !== run ? 'stopped' : started ? 'spoken' : 'silent'), 3500);
      }
      player.dataset.clip = clipKey(parts[at]);
      player.src = clips[at++];
      const playing = player.play();
      if (playing && playing.catch) {
        playing.catch((e) => {
          if (mine !== run) return finish('stopped');
          // NotAllowedError means the player was never started from a tap.
          // A recording it cannot play is reported through onError instead.
          if (!started && e && e.name === 'NotAllowedError') finish('silent');
        });
      }
    }

    // Fetching the recordings can take a while on a slow connection the first
    // time; only give up on them if it takes very long.
    watchdog = window.setTimeout(() => finish(mine !== run ? 'stopped' : 'silent'), 15000);

    loadVoice()
      .then((idx) => {
        if (!idx) throw new Error('no index');
        const where = parts.map((part) => idx.clips[clipKey(part)]);
        if (where.some((spot) => !spot)) throw new Error('no clip');
        return Promise.all(where.map((spot) => loadPack(idx.packs[spot[0]]).then((bytes) => ({ bytes, offset: spot[1], length: spot[2] }))));
      })
      .then((ready) => {
        if (settled) return;
        if (mine !== run) return finish('stopped');
        spots = ready;
        clips = spots.map((spot) => clipAddress(spot.bytes, spot.offset, spot.length, false));
        player.onplaying = onPlaying;
        player.onended = onEnded;
        player.onerror = onError;
        next();
      })
      .catch(() => finish(mine !== run ? 'stopped' : 'silent'));
  });
}

// ---- the device's own voice, as a stand-in

const alive = []; // keeps utterances from being collected before they finish
let cancelledAt = 0;

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

function speakWithDevice(parts, mine) {
  return new Promise((resolve) => {
    const s = synth();
    if (!deviceVoice()) return resolve('silent');
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
        u.rate = part.rate || (part.slow ? 0.5 : 0.9);
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
    // Speaking straight after a cancel can be swallowed, so leave a short gap then.
    const busy = s.speaking || s.pending;
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

// ---- what the rest of the game calls

// Says one or more things in order. Each part is { text, slow, rate }.
// Resolves with 'spoken' when it was really said, 'silent' when no sound could
// be started, or 'stopped' when something else interrupted.
export function speak(parts) {
  if (!parts.length) return Promise.resolve('silent');
  const mine = ++run;
  window.clearTimeout(gapTimer);
  if (endRecorded) endRecorded();
  if (!player) return speakWithDevice(parts, mine);
  return playRecorded(parts, mine).then((result) => (result === 'silent' && mine === run ? speakWithDevice(parts, mine) : result));
}

export function stopSpeaking() {
  run++;
  window.clearTimeout(gapTimer);
  if (endRecorded) endRecorded();
  alive.length = 0;
  if (player && !player.paused) {
    try {
      player.pause();
    } catch (e) {
      /* ignore */
    }
  }
  const s = synth();
  if (s && (s.speaking || s.pending)) {
    s.cancel();
    cancelledAt = Date.now();
  }
}

// Coming back to the game after it was in the background can leave the
// device voice paused; this nudges it awake.
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

export const sayWord = (word, slow = false) => speak([{ text: word, slow, rate: slow ? 0.5 : 0.82 }]);
export const saySentence = (sentence) => speak([{ text: sentence, rate: 0.92 }]);
