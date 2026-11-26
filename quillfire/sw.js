// Offline support. When there is a connection the game always loads the
// newest files; when there is none it runs from the copy saved on the device.
//
// The file lists and versions below are written by tools/update-offline-list.mjs.
// Run that script after adding, removing or changing any file.
//
// Blip's recorded voice (audio/) is kept in a store of its own. It is a few
// megabytes and changes far less often than the code, so it is not fetched
// again every time the game is updated.

const VERSION = 'quillfire-e20e542bfb';
const ASSETS = [
  /* ASSETS:START */
  './',
  'index.html',
  'manifest.json',
  'css/app.css',
  'css/fonts.css',
  'fonts/atkinson-next.woff2',
  'fonts/oxanium.woff2',
  'fonts/russo-one.woff2',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'js/audio.js',
  'js/battle.js',
  'js/content/hangar.js',
  'js/content/index.js',
  'js/content/meanings.js',
  'js/content/parts.js',
  'js/content/reading.js',
  'js/content/sentences.js',
  'js/content/sounds.js',
  'js/content/voice-lines.js',
  'js/content/words.js',
  'js/encounters.js',
  'js/gfx.js',
  'js/main.js',
  'js/screens.js',
  'js/store.js',
  'js/ui.js',
  /* ASSETS:END */
];
const VOICE = 'quillfire-voice-545941eeaf';
const VOICE_FILES = [
  /* VOICE:START */
  'audio/index.json',
  'audio/sector-1.bin',
  'audio/sector-2.bin',
  'audio/sector-3.bin',
  'audio/sector-4.bin',
  'audio/sector-5.bin',
  'audio/sector-6.bin',
  'audio/ui.bin',
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
      if (await cache.match(file, { ignoreVary: true })) continue;
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
    // (the host may serve one file in several forms, such as a picture as PNG or
    // WebP; any saved form will do)
    const saved = (await cache.match(request, { ignoreSearch: true, ignoreVary: true })) || (request.mode === 'navigate' ? await cache.match('./', { ignoreVary: true }) : null);
    if (saved) return saved;
    throw error;
  }
}

// A recording keeps its contents for as long as the voice version stays the
// same, so the saved copy is used first and the network only when there is none.
async function voiceFirst(request) {
  const cache = await caches.open(VOICE);
  const saved = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
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
