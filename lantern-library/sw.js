// Offline support. When there is a connection the game always loads the
// newest files; when there is none it runs from the copy saved on the device.
//
// The file list and version below are written by tools/update-offline-list.mjs.
// Run that script after adding, removing or changing any file.

const VERSION = 'lantern-library-196962cf66';
const ASSETS = [
  /* ASSETS:START */
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'css/fonts.css',
  'fonts/fraunces-soft.woff2',
  'fonts/literata-italic.woff2',
  'fonts/literata.woff2',
  'fonts/nunito.woff2',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/icon.svg',
  'js/art.js',
  'js/audio.js',
  'js/content/book-keeper.js',
  'js/content/book-mapmaker.js',
  'js/content/book-skystone.js',
  'js/content/book-sparks.js',
  'js/content/book-tales.js',
  'js/content/book-wild.js',
  'js/content/index.js',
  'js/content/skills.js',
  'js/main.js',
  'js/nav.js',
  'js/questions.js',
  'js/screens/badges.js',
  'js/screens/book.js',
  'js/screens/glimshop.js',
  'js/screens/grownups.js',
  'js/screens/home.js',
  'js/screens/practice.js',
  'js/screens/reader.js',
  'js/screens/welcome.js',
  'js/screens/words.js',
  'js/store.js',
  'js/text.js',
  'js/ui.js',
  /* ASSETS:END */
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
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

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});
