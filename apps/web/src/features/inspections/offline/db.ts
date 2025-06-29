import Dexie, { Table } from 'dexie';
import type { 
  ITPAssignment,
  Inspection,
  InspectionAttachment,
  SyncConflict 
} from '@siteproof/database';

// Offline-first database schema
export interface OfflineInspection extends Inspection {
  _localId?: string;
  _isDirty?: boolean;
  _lastModified?: number;
  _syncStatus?: 'pending' | 'syncing' | 'synced' | 'conflict';
}

export interface OfflineAttachment extends InspectionAttachment {
  _localId?: string;
  _localPath?: string;
  _uploadStatus?: 'pending' | 'uploading' | 'uploaded' | 'failed';
  _uploadProgress?: number;
  _blob?: Blob;
}

export interface SyncQueue {
  id?: number;
  type: 'inspection' | 'attachment';
  action: 'create' | 'update' | 'delete';
  entityId: string;
  data: any;
  attempts: number;
  lastAttempt?: number;
  error?: string;
  createdAt: number;
}

export interface OfflinePhoto {
  id: string;
  inspectionId: string;
  fieldId: string;
  blob: Blob;
  thumbnail?: Blob;
  metadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    capturedAt: number;
    location?: {
      latitude: number;
      longitude: number;
      accuracy: number;
    };
  };
  createdAt: number;
}

class InspectionDatabase extends Dexie {
  // Tables
  assignments!: Table<ITPAssignment>;
  inspections!: Table<OfflineInspection>;
  attachments!: Table<OfflineAttachment>;
  syncQueue!: Table<SyncQueue>;
  conflicts!: Table<SyncConflict>;
  photos!: Table<OfflinePhoto>;

  constructor() {
    super('SiteProofInspections');
    
    this.version(1).stores({
      // Assignments - cached from server
      assignments: `
        id,
        template_id,
        project_id,
        lot_id,
        assigned_to,
        status,
        due_date,
        [project_id+assigned_to],
        [status+assigned_to]
      `,
      
      // Inspections - offline-first with sync
      inspections: `
        id,
        _localId,
        assignment_id,
        template_id,
        project_id,
        lot_id,
        inspector_id,
        client_id,
        status,
        _syncStatus,
        [project_id+inspector_id],
        [assignment_id+inspector_id],
        [_syncStatus+inspector_id]
      `,
      
      // Attachments - handle file uploads
      attachments: `
        id,
        _localId,
        inspection_id,
        field_id,
        _uploadStatus,
        [inspection_id+field_id],
        [_uploadStatus]
      `,
      
      // Sync queue for offline operations
      syncQueue: `
        ++id,
        type,
        action,
        entityId,
        createdAt,
        [type+entityId]
      `,
      
      // Conflicts requiring resolution
      conflicts: `
        id,
        inspection_id,
        resolved,
        detected_at
      `,
      
      // Photos stored locally
      photos: `
        id,
        inspectionId,
        fieldId,
        [inspectionId+fieldId],
        createdAt
      `
    });

    // Hooks for automatic sync queue management
    this.inspections.hook('creating', (_primKey, obj) => {
      obj._localId = obj._localId || `local-${Date.now()}-${Math.random()}`;
      obj._isDirty = true;
      obj._lastModified = Date.now();
      obj._syncStatus = 'pending';
    });

    this.inspections.hook('updating', (modifications: any, _primKey, obj: any) => {
      modifications._isDirty = true;
      modifications._lastModified = Date.now();
      if (obj._syncStatus === 'synced') {
        modifications._syncStatus = 'pending';
      }
    });

    this.attachments.hook('creating', (_primKey, obj) => {
      obj._localId = obj._localId || `local-${Date.now()}-${Math.random()}`;
      obj._uploadStatus = 'pending';
    });
  }

  // Helper methods
  async addToSyncQueue(
    type: SyncQueue['type'],
    action: SyncQueue['action'],
    entityId: string,
    data: any
  ): Promise<void> {
    await this.syncQueue.add({
      type,
      action,
      entityId,
      data,
      attempts: 0,
      createdAt: Date.now(),
    });
  }

  async getUnsyncedInspections(): Promise<OfflineInspection[]> {
    return this.inspections
      .where('_syncStatus')
      .anyOf(['pending', 'conflict'])
      .toArray();
  }

  async getPendingUploads(): Promise<OfflineAttachment[]> {
    return this.attachments
      .where('_uploadStatus')
      .anyOf(['pending', 'failed'])
      .toArray();
  }

  async getSyncQueueItems(limit = 10): Promise<SyncQueue[]> {
    return this.syncQueue
      .orderBy('createdAt')
      .limit(limit)
      .toArray();
  }

  async markInspectionSynced(inspectionId: string, serverId?: string): Promise<void> {
    await this.transaction('rw', this.inspections, this.syncQueue, async () => {
      const inspection = await this.inspections.get(inspectionId);
      if (inspection) {
        await this.inspections.update(inspectionId, {
          id: serverId || inspection.id,
          _syncStatus: 'synced',
          _isDirty: false,
          last_synced_at: new Date().toISOString(),
        });
        
        // Remove from sync queue
        await this.syncQueue
          .where('entityId')
          .equals(inspectionId)
          .delete();
      }
    });
  }

  async markAttachmentUploaded(attachmentId: string, serverUrl: string): Promise<void> {
    await this.transaction('rw', this.attachments, this.photos, async () => {
      await this.attachments.update(attachmentId, {
        file_url: serverUrl,
        _uploadStatus: 'uploaded',
        is_synced: true,
      });
      
      // Remove local photo blob if exists
      const attachment = await this.attachments.get(attachmentId);
      if (attachment?._localId) {
        await this.photos
          .where('id')
          .equals(attachment._localId)
          .delete();
      }
    });
  }

  async storePhoto(inspectionId: string, fieldId: string, blob: Blob): Promise<string> {
    const photoId = `photo-${Date.now()}-${Math.random()}`;
    
    // Generate thumbnail
    const thumbnail = await this.generateThumbnail(blob);
    
    // Get location if available
    let location;
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: true,
          });
        });
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
      } catch (error) {
        // Location not available
      }
    }
    
    await this.photos.add({
      id: photoId,
      inspectionId,
      fieldId,
      blob,
      thumbnail,
      metadata: {
        fileName: `inspection-${Date.now()}.jpg`,
        fileSize: blob.size,
        mimeType: blob.type,
        capturedAt: Date.now(),
        location,
      },
      createdAt: Date.now(),
    });
    
    return photoId;
  }

  private async generateThumbnail(blob: Blob): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      img.onload = () => {
        // Generate 200x200 thumbnail
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        
        // Calculate crop dimensions
        const scale = Math.max(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;
        
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        canvas.toBlob((thumbnailBlob) => {
          resolve(thumbnailBlob || blob);
        }, 'image/jpeg', 0.8);
      };
      
      img.src = URL.createObjectURL(blob);
    });
  }

  async clearOldData(daysToKeep = 30): Promise<void> {
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    await this.transaction('rw', this.inspections, this.attachments, this.photos, async () => {
      // Remove old synced inspections
      const oldInspections = await this.inspections
        .where('_syncStatus').equals('synced')
        .and(item => item._lastModified! < cutoffDate)
        .toArray();
      
      for (const inspection of oldInspections) {
        await this.inspections.delete(inspection.id);
        await this.attachments
          .where('inspection_id')
          .equals(inspection.id)
          .delete();
      }
      
      // Remove orphaned photos
      const allPhotos = await this.photos.toArray();
      for (const photo of allPhotos) {
        const inspectionExists = await this.inspections
          .where('id')
          .equals(photo.inspectionId)
          .count();
        
        if (inspectionExists === 0) {
          await this.photos.delete(photo.id);
        }
      }
    });
  }
}

// Export singleton instance
export const db = new InspectionDatabase();

// Export types
export type { InspectionDatabase };