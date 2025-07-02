import Dexie, { Table } from 'dexie';

// Define interfaces for offline storage
export interface OfflineInspection {
  id: string;
  template_id: string;
  project_id: string;
  lot_id?: string;
  name: string;
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  responses: Record<string, any>;
  completion_percentage: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  offline_id?: string;
  sync_status: 'pending' | 'synced' | 'conflict';
  last_sync_attempt?: string;
}

export interface OfflineTemplate {
  id: string;
  name: string;
  description?: string;
  structure: any;
  category?: string;
  organization_id: string;
  is_active: boolean;
  last_accessed: string;
  downloaded_at: string;
}

export interface SyncMetadata {
  key: string;
  value: string;
  updated_at: string;
}

// Dexie database for offline storage
class InspectionOfflineDB extends Dexie {
  inspections!: Table<OfflineInspection>;
  templates!: Table<OfflineTemplate>;
  syncMetadata!: Table<SyncMetadata>;

  constructor() {
    super('InspectionOfflineDB');

    this.version(1).stores({
      inspections: 'id, template_id, project_id, lot_id, status, sync_status, updated_at',
      templates: 'id, organization_id, category, last_accessed',
      syncMetadata: 'key',
    });
  }
}

const db = new InspectionOfflineDB();

export class InspectionSyncService {
  private isOnline(): boolean {
    return navigator.onLine;
  }

  private async getLastSyncTimestamp(): Promise<string | null> {
    try {
      const metadata = await db.syncMetadata.get('last_sync_timestamp');
      return metadata?.value || null;
    } catch (error) {
      console.error('Error getting last sync timestamp:', error);
      return null;
    }
  }

  private async setLastSyncTimestamp(timestamp: string): Promise<void> {
    try {
      await db.syncMetadata.put({
        key: 'last_sync_timestamp',
        value: timestamp,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error setting last sync timestamp:', error);
    }
  }

  // Save inspection locally (works offline)
  async saveInspectionLocally(
    inspection: Omit<OfflineInspection, 'sync_status' | 'updated_at'>
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      await db.inspections.put({
        ...inspection,
        updated_at: now,
        sync_status: 'pending',
      });
    } catch (error) {
      console.error('Error saving inspection locally:', error);
      throw new Error('Failed to save inspection offline');
    }
  }

  // Get inspection from local storage
  async getInspectionLocally(id: string): Promise<OfflineInspection | undefined> {
    try {
      return await db.inspections.get(id);
    } catch (error) {
      console.error('Error getting inspection locally:', error);
      return undefined;
    }
  }

  // Get all pending inspections for sync
  async getPendingInspections(): Promise<OfflineInspection[]> {
    try {
      return await db.inspections.where('sync_status').equals('pending').toArray();
    } catch (error) {
      console.error('Error getting pending inspections:', error);
      return [];
    }
  }

  // Save template locally
  async saveTemplateLocally(
    template: Omit<OfflineTemplate, 'downloaded_at' | 'last_accessed'>
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      await db.templates.put({
        ...template,
        downloaded_at: now,
        last_accessed: now,
      });
    } catch (error) {
      console.error('Error saving template locally:', error);
      throw new Error('Failed to save template offline');
    }
  }

  // Get templates from local storage
  async getTemplatesLocally(organizationId?: string): Promise<OfflineTemplate[]> {
    try {
      let query = db.templates.orderBy('last_accessed').reverse();
      if (organizationId) {
        query = query.filter((t) => t.organization_id === organizationId);
      }
      return await query.toArray();
    } catch (error) {
      console.error('Error getting templates locally:', error);
      return [];
    }
  }

  // Update template access time
  async updateTemplateAccess(templateId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      await db.templates.update(templateId, { last_accessed: now });
    } catch (error) {
      console.error('Error updating template access:', error);
    }
  }

  // Perform full sync with server
  async performSync(): Promise<{
    success: boolean;
    conflicts?: any[];
    error?: string;
  }> {
    if (!this.isOnline()) {
      return { success: false, error: 'Device is offline' };
    }

    try {
      const lastSync = await this.getLastSyncTimestamp();
      const pendingInspections = await this.getPendingInspections();
      const templates = await this.getTemplatesLocally();

      // Prepare sync data
      const syncData = {
        lastSyncTimestamp: lastSync,
        inspections: pendingInspections.map((i) => ({
          id: i.id,
          template_id: i.template_id,
          project_id: i.project_id,
          lot_id: i.lot_id,
          name: i.name,
          status: i.status,
          responses: i.responses,
          completion_percentage: i.completion_percentage,
          notes: i.notes,
          created_at: i.created_at,
          updated_at: i.updated_at,
          completed_at: i.completed_at,
          offline_id: i.offline_id,
        })),
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          structure: t.structure,
          last_accessed: t.last_accessed,
        })),
      };

      // Send to server
      const response = await fetch('/api/inspections/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncData),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update local data with server response
      await this.processSyncResult(result);

      return {
        success: result.inspections.conflicts.length === 0,
        conflicts:
          result.inspections.conflicts.length > 0 ? result.inspections.conflicts : undefined,
      };
    } catch (error) {
      console.error('Sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      };
    }
  }

  private async processSyncResult(result: any): Promise<void> {
    try {
      // Mark successfully synced inspections
      for (const inspection of result.inspections.created) {
        await db.inspections.update(inspection.id, { sync_status: 'synced' });
      }

      for (const inspection of result.inspections.updated) {
        await db.inspections.update(inspection.id, { sync_status: 'synced' });
      }

      // Mark conflicted inspections
      for (const conflict of result.inspections.conflicts) {
        await db.inspections.update(conflict.client.id, { sync_status: 'conflict' });
      }

      // Update local data with server updates
      for (const serverInspection of result.serverUpdates.inspections) {
        await db.inspections.put({
          ...serverInspection,
          sync_status: 'synced',
        });
      }

      for (const serverTemplate of result.serverUpdates.templates) {
        await this.saveTemplateLocally(serverTemplate);
      }

      // Update last sync timestamp
      await this.setLastSyncTimestamp(result.lastSyncTimestamp);
    } catch (error) {
      console.error('Error processing sync result:', error);
    }
  }

  // Download bulk data for offline use
  async downloadBulkData(projectIds?: string[]): Promise<{
    success: boolean;
    recordCount?: number;
    error?: string;
  }> {
    if (!this.isOnline()) {
      return { success: false, error: 'Device is offline' };
    }

    try {
      const lastSync = await this.getLastSyncTimestamp();

      const downloadData = {
        project_ids: projectIds,
        include_templates: true,
        include_assignments: true,
        include_responses: true,
        last_sync: lastSync,
      };

      const response = await fetch('/api/inspections/bulk-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(downloadData),
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const bulkData = await response.json();

      // Store data locally
      let recordCount = 0;

      // Store inspections
      for (const inspection of bulkData.inspections) {
        await db.inspections.put({
          ...inspection,
          sync_status: 'synced',
        });
        recordCount++;
      }

      // Store templates
      for (const template of bulkData.templates) {
        await this.saveTemplateLocally(template);
        recordCount++;
      }

      // Update sync timestamp
      await this.setLastSyncTimestamp(bulkData.metadata.downloaded_at);

      return { success: true, recordCount };
    } catch (error) {
      console.error('Bulk download error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown download error',
      };
    }
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    lastSync: string | null;
    pendingCount: number;
    conflictCount: number;
  }> {
    const lastSync = await this.getLastSyncTimestamp();
    const pendingCount = await db.inspections.where('sync_status').equals('pending').count();
    const conflictCount = await db.inspections.where('sync_status').equals('conflict').count();

    return {
      isOnline: this.isOnline(),
      lastSync,
      pendingCount,
      conflictCount,
    };
  }

  // Clear all offline data (for logout, etc.)
  async clearOfflineData(): Promise<void> {
    try {
      await db.delete();
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }
}

// Export singleton instance
export const inspectionSyncService = new InspectionSyncService();
