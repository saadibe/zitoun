const CACHE_NAME = 'laperla-pos-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap'
];

// Installation - mise en cache des assets statiques
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function() {});
    })
  );
});

// Activation - nettoyer les anciens caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// Fetch - stratégie Network First pour l'API, Cache First pour les assets
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // API calls → toujours réseau (pas de cache)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('onrender.com')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response(JSON.stringify({error:'offline'}),
          {headers:{'Content-Type':'application/json'}});
      })
    );
    return;
  }

  // Assets statiques → Cache First
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Offline fallback → retourner index.html
        return caches.match('/index.html');
      });
    })
  );
});
