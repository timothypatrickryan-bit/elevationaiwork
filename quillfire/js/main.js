// Starts the game and moves between screens.

import * as screens from './screens.js';
import { S, save, addTime } from './store.js';
import { unlockAudio, sleepAudio, loadVoice, resetVoice, prepareVoice, stopSpeaking } from './audio.js';
import { STORY } from './content/index.js';

const app = document.getElementById('app');
let current = null;
let shown = '';

// A handle for the automated play-throughs. `?fast=4` runs battles four times
// as fast; nothing else changes.
const fast = Number(new URLSearchParams(window.location.search).get('fast')) || 0;
window.__qf = { fast, battle: null, layout: [], go: (name, params) => go(name, params), state: S, screen: () => shown };

function go(name, params) {
  if (current && current.leave) current.leave();
  stopSpeaking();
  app.querySelectorAll('.toast, .modal').forEach((n) => n.remove());
  shown = name;
  current = screens[name](app, params, go) || {};
}

// An iPad lets a page make sound only after a tap.
document.addEventListener('touchend', unlockAudio, true);
document.addEventListener('click', unlockAudio, true);
document.addEventListener('visibilitychange', () => sleepAudio(document.hidden));

// Minutes played, for the grown-ups page: time on any screen but the title
// and the grown-ups page itself, counted while the game is on screen.
let tick = Date.now();
window.setInterval(() => {
  const now = Date.now();
  const secs = (now - tick) / 1000;
  tick = now;
  if (document.hidden || secs > 30 || ['title', 'grown', 'battle', ''].includes(shown)) return; // battles report their own time
  addTime(secs);
  save();
}, 15000);

// Keep the screen from being dragged or zoomed while playing.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

async function start() {
  try {
    await Promise.all(['700 24px "Atkinson Hyperlegible Next"', '400 24px "Russo One"', '700 16px "Oxanium"'].map((f) => document.fonts.load(f)));
  } catch (e) {
    /* the game works with the device's own typefaces */
  }
  loadVoice();
  prepareVoice(STORY.intro);
  go('title');
}
start();

// Offline support, only when the game is served as its own site.
if ('serviceWorker' in navigator && window.top === window.self && /^https?:$/.test(window.location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .then(() => navigator.serviceWorker.ready)
      // once the game is running, have Blip's voice saved for offline use
      .then((registration) => registration.active && registration.active.postMessage({ type: 'save-voice' }))
      .catch(() => {});
  });
  // A new version of the game has taken over. Its recordings may differ, and it
  // has not been asked to save them yet.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    resetVoice();
    const worker = navigator.serviceWorker.controller;
    if (worker) worker.postMessage({ type: 'save-voice' });
  });
}
