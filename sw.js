const CACHE = 'optimisation-ocp-pv-v1';
const PRECACHE_URLS = [
  '/HK_energies/',
  '/HK_energies/index.html',
  '/HK_energies/Solar Profitability.html',
  '/HK_energies/Storage Cost.html',
  '/HK_energies/Full Analysis.html',
  '/HK_energies/Battery Parameters.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap',
  'https://fonts.gstatic.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('/HK_energies/index.html');
        }
      });
    })
  );
});
