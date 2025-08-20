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
  console.log('[SW] Push notification received:', event);
  
  if (!event.data) {
    console.log('[SW] No data in push notification');
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch (error) {
    console.error('[SW] Failed to parse push data:', error);
    notificationData = {
      title: 'SiteProof Notification',
      body: event.data.text(),
    };
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/icons/icon-192x192.png',
    badge: notificationData.badge || '/icons/icon-72x72.png',
    vibrate: notificationData.vibrate || [200, 100, 200],
    tag: notificationData.tag || 'default',
    requireInteraction: notificationData.requireInteraction || false,
    data: notificationData.data || {},
    actions: notificationData.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  const notificationData = event.notification.data;
  let url = '/dashboard';

  // Handle different notification types
  if (notificationData.type === 'ncr_assignment' && notificationData.ncrId) {
    url = `/dashboard/ncrs/${notificationData.ncrId}`;
  } else if (notificationData.type === 'inspection_due' && notificationData.inspectionId) {
    url = `/dashboard/inspections/${notificationData.inspectionId}`;
  } else if (event.notification.data.url) {
    url = event.notification.data.url;
  }

  // Handle action clicks
  if (event.action === 'view' || event.action === 'start' || event.action === 'explore') {
    // Open the relevant page
    event.waitUntil(
      clients.openWindow(url).then((windowClient) => {
        if (windowClient) windowClient.focus();
      })
    );
  } else if (event.action === 'snooze') {
    // Schedule a reminder
    console.log('[SW] Snooze requested for notification');
  } else if (event.action === 'dismiss' || event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the URL
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if there's already a window/tab open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});