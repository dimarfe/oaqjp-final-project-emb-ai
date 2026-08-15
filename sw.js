const CACHE = 'mi-mundo-magico-v4';
const CORE = [
  './',
  'index.html',
  'style.css',
  'loader.js',
  'manifest.json',
  'icon.svg',
  'chunks/app-gz-00.txt',
  'chunks/app-gz-01.txt',
  'chunks/image-00.txt',
  'chunks/image-01.txt',
  'chunks/image-02.txt',
  'chunks/image-03.txt',
  'chunks/image-04.txt'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok && new URL(event.request.url).origin === location.origin) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match('index.html')))
  );
});
