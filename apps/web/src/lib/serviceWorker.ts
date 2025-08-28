export async function registerServiceWorker() {
  // Service worker disabled - no PWA icons available
  return undefined;
  /*
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      console.log('Service Worker registered successfully:', registration.scope);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // New service worker activated, show update prompt
              if (confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });
      
      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return undefined;
    }
  }
  return undefined;
  */
}

export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
}

export async function requestBackgroundSync(tag: string) {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(tag);
      console.log('Background sync registered:', tag);
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }
}

export function setupServiceWorkerListeners() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SYNC_REQUESTED') {
        // Trigger sync from IndexedDB
        window.dispatchEvent(
          new CustomEvent('sw-sync-requested', {
            detail: { timestamp: event.data.timestamp },
          })
        );
      }
    });
  }
}

export async function cacheUrls(urls: string[]) {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({
      type: 'CACHE_URLS',
      urls,
    });
  }
}
