// Offline support. When there is a connection the game always loads the
// newest files; when there is none it runs from the copy saved on the device.
//
// The file lists and versions below are written by tools/update-offline-list.mjs.
// Run that script after adding, removing or changing any file.
//
// The recorded voice (audio/) is kept in a store of its own. It is several
// megabytes and changes far less often than the code, so it is not fetched
// again every time the game is updated.

const VERSION = 'spellery-073682c576';
const ASSETS = [
  /* ASSETS:START */
  './',
  'index.html',
  'manifest.json',
  'css/app.css',
  'css/fonts.css',
  'fonts/atkinson-next.woff2',
  'fonts/caprasimo.woff2',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/icon.svg',
  'js/activities/build.js',
  'js/activities/cards.js',
  'js/activities/dictation.js',
  'js/activities/parts.js',
  'js/activities/proof.js',
  'js/art.js',
  'js/audio.js',
  'js/content/index.js',
  'js/content/shelf-1.js',
  'js/content/shelf-2.js',
  'js/content/shelf-3.js',
  'js/content/shelf-4.js',
  'js/content/shelf-5.js',
  'js/content/shelf-6.js',
  'js/content/shelf-7.js',
  'js/keyboard.js',
  'js/main.js',
  'js/nav.js',
  'js/screens/badges.js',
  'js/screens/book.js',
  'js/screens/grownups.js',
  'js/screens/home.js',
  'js/screens/petshop.js',
  'js/screens/review.js',
  'js/screens/unit.js',
  'js/screens/welcome.js',
  'js/session.js',
  'js/store.js',
  'js/ui.js',
  'js/voice-lines.js',
  'js/words.js',
  /* ASSETS:END */
];
const VOICE = 'spellery-voice-02154b3b53';
const VOICE_FILES = [
  /* VOICE:START */
  'audio/ar-or.bin',
  'audio/aw-au.bin',
  'audio/ck.bin',
  'audio/contractions.bin',
  'audio/dge.bin',
  'audio/doubling.bin',
  'audio/drop-e.bin',
  'audio/ed.bin',
  'audio/er-ir-ur.bin',
  'audio/floss.bin',
  'audio/ie-ei.bin',
  'audio/index.json',
  'audio/le-el-al.bin',
  'audio/long-a.bin',
  'audio/long-e.bin',
  'audio/long-i.bin',
  'audio/long-o.bin',
  'audio/long-u.bin',
  'audio/magic-e.bin',
  'audio/more-twins.bin',
  'audio/oi-ou.bin',
  'audio/ough.bin',
  'audio/ph-ch.bin',
  'audio/plurals.bin',
  'audio/prefixes.bin',
  'audio/rebels-1.bin',
  'audio/rebels-2.bin',
  'audio/silent.bin',
  'audio/soft-c-g.bin',
  'audio/sound-twins.bin',
  'audio/suffixes.bin',
  'audio/tch.bin',
  'audio/tion-sion.bin',
  'audio/ture-sure.bin',
  'audio/twins.bin',
  'audio/ui.bin',
  'audio/y-to-i.bin',
  /* VOICE:END */
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Removes the saved copies of earlier versions.
function dropOldCopies() {
  return caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== VOICE).map((k) => caches.delete(k))));
}

self.addEventListener('activate', (event) => {
  event.waitUntil(dropOldCopies().then(() => self.clients.claim()));
});

// Saves every recording that is not saved yet. One that fails is simply left
// for next time; nothing here can stop the game from working.
async function saveMissingVoice() {
  const cache = await caches.open(VOICE);
  for (const file of VOICE_FILES) {
    try {
      if (await cache.match(file)) continue;
      const response = await fetch(file);
      if (response.ok) await cache.put(file, response);
    } catch (error) {
      /* offline or interrupted; the game asks again on its next launch */
    }
  }
}

// The game may ask twice in quick succession; one pass at a time is enough.
let saving = null;
function saveVoice() {
  if (!saving) {
    saving = saveMissingVoice().then(
      () => {
        saving = null;
      },
      () => {
        saving = null;
      }
    );
  }
  return saving;
}

// The game asks for the recordings to be saved once it is up and running, so
// that saving them never delays the first screen. The version this one
// replaced may have saved a few last files while it was being retired, so its
// copy is cleared away again here.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'save-voice') event.waitUntil(dropOldCopies().then(saveVoice));
});

function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const fresh = await fetchWithTimeout(request, 4000);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (error) {
    const saved = (await cache.match(request, { ignoreSearch: true })) || (request.mode === 'navigate' ? await cache.match('./') : null);
    if (saved) return saved;
    throw error;
  }
}

// A recording keeps its contents for as long as the voice version stays the
// same, so the saved copy is used first and the network only when there is none.
async function voiceFirst(request) {
  const cache = await caches.open(VOICE);
  const saved = await cache.match(request, { ignoreSearch: true });
  if (saved) return saved;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(url.pathname.includes('/audio/') ? voiceFirst(request) : networkFirst(request));
});
