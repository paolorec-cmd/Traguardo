const CACHE_NAME = 'traguardo-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Installazione: mette in cache i file principali dell'app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Attivazione: rimuove eventuali cache vecchie
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Strategia: rete prima, fallback su cache se offline (così i contenuti restano aggiornati quando c'è rete)
self.addEventListener('fetch', (event) => {
  // Non intercettare le chiamate al Worker AI o a JSONBin: devono sempre passare dalla rete
  if (event.request.url.includes('workers.dev') || event.request.url.includes('jsonbin.io')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
