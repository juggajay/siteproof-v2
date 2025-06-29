import { useState, useCallback } from 'react';
import { db } from '../offline/db';
import { createClient } from '@/lib/supabase/client';

export function useInspectionSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const supabase = createClient();

  const syncInspection = useCallback(async (inspectionId: string) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const inspection = await db.inspections.get(inspectionId);
      if (!inspection) {
        throw new Error('Inspection not found');
      }

      // Check if already synced
      if (inspection._syncStatus === 'synced' && !inspection._isDirty) {
        return;
      }

      // Prepare data for server
      // Note: serverData was prepared but not used in the current implementation
      // The sync function only uses specific fields directly from inspection

      // Call server sync function
      const { data, error } = await supabase.rpc('sync_inspection', {
        p_client_id: inspection.client_id,
        p_inspection_data: inspection.data,
        p_sync_version: inspection.sync_version,
      });

      if (error) {
        throw error;
      }

      // Handle sync result
      if (data.status === 'conflict') {
        // Add to conflicts table
        await db.conflicts.add({
          id: `conflict-${Date.now()}`,
          inspection_id: inspectionId,
          server_data: data.server_data,
          client_data: inspection.data,
          conflict_type: 'version_conflict',
          detected_at: new Date().toISOString(),
          resolved: false,
        });

        // Update inspection status
        await db.inspections.update(inspectionId, {
          _syncStatus: 'conflict',
        });
      } else {
        // Sync successful
        await db.markInspectionSynced(inspectionId, data.inspection_id);
      }

      // Sync attachments
      await syncAttachments(inspectionId);
    } catch (error) {
      console.error('Failed to sync inspection:', error);
      setSyncError(error as Error);
      
      // Add to sync queue for retry
      await db.addToSyncQueue('inspection', 'update', inspectionId, error);
    } finally {
      setIsSyncing(false);
    }
  }, [supabase]);

  const syncAttachments = async (inspectionId: string) => {
    const attachments = await db.attachments
      .where('inspection_id')
      .equals(inspectionId)
      .and(item => item._uploadStatus !== 'uploaded')
      .toArray();

    for (const attachment of attachments) {
      try {
        // Get photo blob if exists
        const photo = attachment._localId
          ? await db.photos.get(attachment._localId)
          : null;

        if (!photo?.blob) continue;

        // Upload to storage
        const fileName = `inspections/${inspectionId}/${attachment.field_id}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('inspection-photos')
          .upload(fileName, photo.blob);

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('inspection-photos')
          .getPublicUrl(fileName);

        // Create attachment record in database
        const { error: dbError } = await supabase
          .from('inspection_attachments')
          .insert({
            inspection_id: inspectionId,
            field_id: attachment.field_id,
            file_url: publicUrl,
            file_name: photo.metadata.fileName,
            file_size: photo.metadata.fileSize,
            file_type: photo.metadata.mimeType,
            metadata: {
              location: photo.metadata.location,
              capturedAt: photo.metadata.capturedAt,
            },
            client_id: attachment.client_id,
          });

        if (dbError) {
          throw dbError;
        }

        // Mark as uploaded
        await db.markAttachmentUploaded(attachment.id, publicUrl);
      } catch (error) {
        console.error('Failed to sync attachment:', error);
        
        // Update upload status
        await db.attachments.update(attachment.id, {
          _uploadStatus: 'failed',
        });
        
        // Add to sync queue
        await db.addToSyncQueue('attachment', 'create', attachment.id, attachment);
      }
    }
  };

  const syncAll = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      // Get all unsynced inspections
      const unsyncedInspections = await db.getUnsyncedInspections();
      
      for (const inspection of unsyncedInspections) {
        await syncInspection(inspection.id);
      }
    } catch (error) {
      console.error('Failed to sync all:', error);
      setSyncError(error as Error);
    } finally {
      setIsSyncing(false);
    }
  }, [syncInspection]);

  return {
    syncInspection,
    syncAll,
    isSyncing,
    syncError,
  };
}