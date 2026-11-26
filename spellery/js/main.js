// Starts the game and moves between screens.

import { loadSave, S } from './store.js';
import { setRouter } from './nav.js';
import { closeLayers } from './ui.js';
import { stopSpeaking, primeVoice, wakeVoice } from './audio.js';
import * as welcome from './screens/welcome.js';
import * as home from './screens/home.js';
import * as unit from './screens/unit.js';
import * as review from './screens/review.js';
import * as book from './screens/book.js';
import * as petshop from './screens/petshop.js';
import * as badges from './screens/badges.js';
import * as grownups from './screens/grownups.js';

const SCREENS = { welcome, home, unit, review, book, petshop, badges, grownups };

let leave = null;

function show(name, params) {
  const screen = SCREENS[name] || SCREENS.home;
  if (leave) {
    const fn = leave;
    leave = null;
    try {
      fn();
    } catch (e) {
      /* a screen failing to tidy up must not block the next one */
    }
  }
  closeLayers();
  stopSpeaking();
  // messages and sparkles belong to the screen being left
  document.querySelectorAll('.toast, .charttip, .spark-burst').forEach((el) => el.remove());
  const app = document.getElementById('app');
  app.textContent = '';
  const out = screen.open(app, params || {});
  if (out && out.leave) leave = out.leave;
}

function start() {
  loadSave();
  setRouter(show);
  show(S().profile.welcomed ? 'home' : 'welcome');
}

// The first tap after opening lets the voice speak later on (see audio.js).
document.addEventListener('click', primeVoice, true);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopSpeaking();
  else wakeVoice();
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();

// Offline support, only when the game is served as its own site.
if ('serviceWorker' in navigator && window.top === window.self && /^https?:$/.test(window.location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
