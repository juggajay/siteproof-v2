'use client';

import { useEffect } from 'react';
import { registerServiceWorker, setupServiceWorkerListeners } from '@/lib/serviceWorker';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker
    registerServiceWorker();
    
    // Setup listeners
    setupServiceWorkerListeners();
    
    // Listen for sync requests from service worker
    const handleSyncRequest = () => {
      // Dispatch a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('inspection-sync-needed'));
    };
    
    window.addEventListener('sw-sync-requested', handleSyncRequest);
    
    return () => {
      window.removeEventListener('sw-sync-requested', handleSyncRequest);
    };
  }, []);

  return <>{children}</>;
}