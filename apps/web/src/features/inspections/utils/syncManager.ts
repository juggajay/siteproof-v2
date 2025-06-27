import { db, SyncQueue } from '../offline/db';
import { requestBackgroundSync } from '@/lib/serviceWorker';

export class SyncManager {
  private static instance: SyncManager;
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start periodic sync
    this.startPeriodicSync();
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Listen for visibility change
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  private handleOnline = async () => {
    console.log('[SyncManager] Back online, starting sync...');
    await this.syncAll();
  };

  private handleOffline = () => {
    console.log('[SyncManager] Gone offline');
  };

  private handleVisibilityChange = async () => {
    if (!document.hidden && navigator.onLine) {
      await this.syncAll();
    }
  };

  private startPeriodicSync() {
    // Sync every 5 minutes when online
    this.syncInterval = setInterval(async () => {
      if (navigator.onLine && !this.syncInProgress) {
        await this.syncAll();
      }
    }, 5 * 60 * 1000);
  }

  async syncAll(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;
    console.log('[SyncManager] Starting sync...');

    try {
      // Process sync queue
      await this.processSyncQueue();
      
      // Register for background sync
      await requestBackgroundSync('sync-inspections');
      
      console.log('[SyncManager] Sync completed');
    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processSyncQueue(): Promise<void> {
    const queueItems = await db.getSyncQueueItems(50);
    
    for (const item of queueItems) {
      try {
        await this.processSyncItem(item);
        
        // Remove from queue on success
        await db.syncQueue.delete(item.id);
      } catch (error) {
        console.error(`[SyncManager] Failed to sync item ${item.id}:`, error);
        
        // Update retry count
        await db.syncQueue.update(item.id!, {
          attempts: item.attempts + 1,
          lastAttempt: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        // Delete if too many attempts
        if (item.attempts >= 5) {
          await db.syncQueue.delete(item.id);
        }
      }
    }
  }

  private async processSyncItem(item: SyncQueue): Promise<void> {
    switch (item.type) {
      case 'inspection':
        await this.syncInspection(item);
        break;
      case 'attachment':
        await this.syncAttachment(item);
        break;
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  private async syncInspection(item: SyncQueue): Promise<void> {
    // This would call the actual sync API
    // For now, we'll just log it
    console.log('[SyncManager] Syncing inspection:', item.entityId);
  }

  private async syncAttachment(item: SyncQueue): Promise<void> {
    // This would upload the attachment
    // For now, we'll just log it
    console.log('[SyncManager] Syncing attachment:', item.entityId);
  }

  async addToQueue(
    type: SyncQueue['type'],
    action: SyncQueue['action'],
    entityId: string,
    data: any
  ): Promise<void> {
    await db.addToSyncQueue(type, action, entityId, data);
    
    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncAll();
    }
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}

// Export singleton instance
export const syncManager = SyncManager.getInstance();