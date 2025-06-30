// Service Worker for SiteProof v2
const CACHE_NAME = 'siteproof-v2-cache-v1';
const DYNAMIC_CACHE = 'siteproof-v2-dynamic-v1';
const OFFLINE_URL = '/offline.html';

// URLs to cache on install
const urlsToCache = [
  '/',
  '/offline.html',
  '/manifest.json',
  // Add critical assets here
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching essential resources');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension and non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API calls - Network First strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache).catch(err => {
              console.warn('[SW] Failed to cache API response:', request.url, err);
            });
          });
          return response;
        })
        .catch(() => {
          // Try to get from cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets - Cache First strategy
  if (request.destination === 'image' || 
      request.destination === 'script' || 
      request.destination === 'style' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            // Only cache http/https requests
            if (request.url.startsWith('http')) {
              return caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, response.clone()).catch(err => {
                  console.warn('[SW] Failed to cache:', request.url, err);
                });
                return response;
              });
            }
            return response;
          });
        })
    );
    return;
  }

  // HTML pages - Network First with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline page for navigation requests
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Default - Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        return caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, response.clone());
          return response;
        });
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync for offline inspections
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-inspections') {
    event.waitUntil(syncInspections());
  }
});

async function syncInspections() {
  // This will be called when we regain connectivity
  // The actual sync logic is handled by the app via IndexedDB
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_REQUESTED',
      timestamp: Date.now()
    });
  });
}

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    caches.open(DYNAMIC_CACHE).then((cache) => {
      cache.addAll(event.data.urls);
    });
  }
});

// Push notifications for inspection assignments
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New inspection assigned',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Inspection',
        icon: '/images/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/images/xmark.png'
      },
    ]
  };

  event.waitUntil(
    self.registration.showNotification('SiteProof Inspection', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    clients.openWindow('/dashboard/inspections');
  }
});