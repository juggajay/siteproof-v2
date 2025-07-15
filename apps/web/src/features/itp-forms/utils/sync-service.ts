import { createClient } from '@/lib/supabase/client';
import { ITPFormType } from '../types/form.types';
import { offlineStorage } from './offline-storage';

export class SyncService {
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;

  async syncForm(form: ITPFormType): Promise<void> {
    const supabase = createClient();
    
    try {
      // Prepare form data for database
      const baseFormData = {
        form_type: form.formType,
        project_id: form.projectId,
        inspector_name: form.inspectorName,
        inspection_date: form.inspectionDate,
        inspection_status: form.inspectionStatus,
        comments: form.comments,
        evidence_files: form.evidenceFiles,
        local_id: form.localId,
        organization_id: form.organizationId
      };

      // Insert base form
      const { data: formData, error: formError } = await supabase
        .from('itp_forms')
        .insert(baseFormData)
        .select()
        .single();

      if (formError) throw formError;

      // Insert specific form data based on type
      await this.syncSpecificFormData(form, formData.id);

      // Update local storage with synced status
      if (form.localId) {
        await offlineStorage.updateSyncStatus(form.localId, 'synced', formData.id);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      if (form.localId) {
        await offlineStorage.updateSyncStatus(form.localId, 'failed');
      }
      throw error;
    }
  }

  private async syncSpecificFormData(form: ITPFormType, formId: string): Promise<void> {
    const supabase = createClient();
    
    switch (form.formType) {
      case 'earthworks_preconstruction': {
        const { error } = await supabase
          .from('itp_earthworks_preconstruction')
          .insert({
            form_id: formId,
            approved_plans_available: form.approvedPlansAvailable,
            start_date_advised: form.startDateAdvised,
            erosion_control_implemented: form.erosionControlImplemented,
            erosion_control_photo: form.erosionControlPhoto,
            hold_point_signature: form.holdPointSignature,
            hold_point_date: form.holdPointDate
          });
        if (error) throw error;
        break;
      }
      case 'earthworks_subgrade': {
        const { error } = await supabase
          .from('itp_earthworks_subgrade')
          .insert({
            form_id: formId,
            erosion_controls_in_place: form.erosionControlsInPlace,
            groundwater_control_measures: form.groundwaterControlMeasures,
            compaction_percentage: form.compactionPercentage,
            surface_tolerances_met: form.surfaceTolerancesMet,
            surface_measurements: form.surfaceMeasurements,
            proof_rolling_completed: form.proofRollingCompleted,
            proof_rolling_photo: form.proofRollingPhoto,
            nata_certificates: form.nataCertificates
          });
        if (error) throw error;
        break;
      }
      // Add other form types...
    }
  }

  async syncAll(): Promise<void> {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    try {
      const unsyncedForms = await offlineStorage.getUnsyncedForms();
      
      for (const form of unsyncedForms) {
        try {
          await this.syncForm(form);
        } catch (error) {
          console.error(`Failed to sync form ${form.localId}:`, error);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  startAutoSync(intervalMs: number = 30000): void {
    this.stopAutoSync();
    
    // Initial sync
    this.syncAll();
    
    // Set up interval
    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, intervalMs);
    
    // Sync on online event
    window.addEventListener('online', () => this.syncAll());
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export const syncService = new SyncService();