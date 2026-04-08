const CACHE_NAME = 'qr-almacen-v1';

// Archivos que se guardan en caché para uso offline
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // CDNs externos
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://unpkg.com/lucide-react@0.383.0/dist/umd/lucide-react.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js'
];

// Instalación: guarda todos los assets en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: guardando assets en caché');
      // Intentamos cachear uno a uno para no fallar si algún CDN tarda
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(err => console.warn('No cacheado:', url, err)))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activación: borra cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('SW: borrando caché antigua:', key);
          return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: sirve desde caché, si no va a red
self.addEventListener('fetch', event => {
  // Solo interceptamos GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // No está en caché: va a la red y lo guarda para la próxima
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return response;
      }).catch(() => {
        // Sin red y sin caché: devuelve la página principal como fallback
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
