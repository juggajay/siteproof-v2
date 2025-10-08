/**
 * ITP (Inspection and Test Plan) Type Definitions
 *
 * This file contains comprehensive type definitions for ITP-related operations
 * including instances, templates, forms, and API responses.
 */

// ============================================================================
// Database Row Types (should be imported from Supabase generated types eventually)
// ============================================================================

export type ITPItemStatus = 'pass' | 'fail' | 'na';
export type ITPInspectionStatus = 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';
export type SyncStatus = 'local' | 'synced' | 'conflict';

export interface ITPTemplateRow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: string | null;
  structure: ITPTemplateStructure;
  is_active: boolean;
  version: number;
  usage_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ITPInstanceRow {
  id: string;
  template_id: string;
  project_id: string;
  lot_id: string;
  organization_id: string;
  created_by: string;
  inspection_status: ITPInspectionStatus;
  inspection_date: string | null;
  sync_status: SyncStatus;
  is_active: boolean;
  data: ITPInstanceData;
  evidence_files: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface LotRow {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ITP Template Structure Types
// ============================================================================

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'date'
  | 'signature'
  | 'photo';

export interface FieldValidation {
  pattern?: string;
  message?: string;
}

export interface ITPField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: string[];
  raise_ncr_on_fail?: boolean;
  validation?: FieldValidation;
}

export interface ITPSection {
  id: string;
  title: string;
  description?: string;
  items: ITPField[];
}

export interface ITPTemplateStructure {
  sections: ITPSection[];
}

// ============================================================================
// ITP Instance Data Types
// ============================================================================

export interface ITPItemResult {
  result: ITPItemStatus;
  notes: string;
  updated_at: string;
  updated_by: string;
}

export interface ITPSectionData {
  [itemId: string]: ITPItemResult;
}

export interface ITPInstanceData {
  [sectionId: string]: ITPSectionData;
}

export interface ITPCompletionMetrics {
  totalItems: number;
  completedItems: number;
  completionPercentage: number;
}

// ============================================================================
// Batch Update Types
// ============================================================================

export interface ITPItemUpdate {
  itemId: string;
  status: ITPItemStatus;
  notes?: string;
}

export interface ITPBatchUpdateRequest {
  instanceId: string;
  updates: ITPItemUpdate[];
}

export type ITPBatchResult =
  | { success: true; instanceId: string; data: ITPInstanceRow }
  | { success: false; instanceId: string; error: string; code?: string };

export interface ITPBatchResponse {
  success: boolean;
  updated: number;
  errors?: Array<{
    instanceId: string;
    error: string;
  }>;
  results: ITPInstanceRow[];
}

// ============================================================================
// Instance Assignment Types
// ============================================================================

export interface LotWithProject extends LotRow {
  projects: ProjectRow;
}

export interface OrganizationMember {
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface AssignITPRequest {
  templateIds: string[];
  lotId: string;
  projectId: string;
}

export interface AssignITPResponse {
  message: string;
  instances: ITPInstanceRow[];
}

export interface InitializedITPData {
  inspection_results: ITPInstanceData;
  overall_status: ITPInspectionStatus;
  completion_percentage: number;
}

// ============================================================================
// ITP Forms Types
// ============================================================================

export type FormType =
  | 'earthworks_preconstruction'
  | 'earthworks_subgrade'
  | 'concrete_formwork'
  | 'concrete_reinforcement'
  | 'concrete_placement'
  | 'structural_steel'
  | 'masonry'
  | 'roofing'
  | 'plumbing_roughin'
  | 'plumbing_final'
  | 'electrical_roughin'
  | 'electrical_final'
  | 'hvac_roughin'
  | 'hvac_final';

export interface BaseFormData {
  formType: FormType;
  projectId: string;
  inspectorName: string;
  inspectionDate: Date;
  inspectionStatus: ITPInspectionStatus;
  comments?: string;
  evidenceFiles?: unknown[];
  localId?: string;
}

export interface EarthworksPreconstructionData {
  approvedPlansAvailable: boolean;
  startDateAdvised: string;
  erosionControlImplemented: boolean;
  erosionControlPhoto?: string;
  holdPointSignature?: string;
  holdPointDate?: string;
}

export interface EarthworksSubgradeData {
  erosionControlsInPlace: boolean;
  groundwaterControlMeasures: boolean;
  compactionPercentage: number;
  surfaceTolerancesMet: boolean;
  surfaceMeasurements?: string;
  proofRollingCompleted: boolean;
  proofRollingPhoto?: string;
  nataCertificates?: string[];
}

export type FormSpecificData =
  | { formType: 'earthworks_preconstruction'; data: EarthworksPreconstructionData }
  | { formType: 'earthworks_subgrade'; data: EarthworksSubgradeData }
  | { formType: 'concrete_formwork'; data: Record<string, unknown> }
  | { formType: 'concrete_reinforcement'; data: Record<string, unknown> }
  | { formType: 'concrete_placement'; data: Record<string, unknown> }
  | { formType: 'structural_steel'; data: Record<string, unknown> }
  | { formType: 'masonry'; data: Record<string, unknown> }
  | { formType: 'roofing'; data: Record<string, unknown> }
  | { formType: 'plumbing_roughin'; data: Record<string, unknown> }
  | { formType: 'plumbing_final'; data: Record<string, unknown> }
  | { formType: 'electrical_roughin'; data: Record<string, unknown> }
  | { formType: 'electrical_final'; data: Record<string, unknown> }
  | { formType: 'hvac_roughin'; data: Record<string, unknown> }
  | { formType: 'hvac_final'; data: Record<string, unknown> };

export interface ITPFormRow {
  id: string;
  form_type: FormType;
  project_id: string;
  inspector_name: string;
  inspection_date: string;
  inspection_status: ITPInspectionStatus;
  comments: string | null;
  evidence_files: unknown[];
  local_id: string | null;
  organization_id: string;
  created_by: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

// ============================================================================
// Update Types
// ============================================================================

export type ITPInstanceUpdate = Partial<Omit<ITPInstanceRow, 'id' | 'created_at' | 'updated_at'>>;
export type ITPTemplateUpdate = Partial<Omit<ITPTemplateRow, 'id' | 'created_at' | 'updated_at'>>;

// ============================================================================
// Type Guards
// ============================================================================

export function isITPItemStatus(status: string): status is ITPItemStatus {
  return ['pass', 'fail', 'na'].includes(status);
}

export function isITPInspectionStatus(status: string): status is ITPInspectionStatus {
  return ['pending', 'in_progress', 'completed', 'approved', 'rejected'].includes(status);
}

export function isValidItemUpdate(update: unknown): update is ITPItemUpdate {
  if (typeof update !== 'object' || update === null) return false;
  const u = update as Record<string, unknown>;
  return (
    typeof u.itemId === 'string' &&
    typeof u.status === 'string' &&
    isITPItemStatus(u.status) &&
    (u.notes === undefined || typeof u.notes === 'string')
  );
}

export function isValidBatchUpdate(update: unknown): update is ITPBatchUpdateRequest {
  if (typeof update !== 'object' || update === null) return false;
  const u = update as Record<string, unknown>;
  return (
    typeof u.instanceId === 'string' &&
    Array.isArray(u.updates) &&
    u.updates.every(isValidItemUpdate)
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate completion metrics for an ITP instance
 */
export function calculateCompletion(data: ITPInstanceData): ITPCompletionMetrics {
  let totalItems = 0;
  let completedItems = 0;

  for (const sectionId in data) {
    const section = data[sectionId];
    for (const itemId in section) {
      totalItems++;
      if (section[itemId]?.result) {
        completedItems++;
      }
    }
  }

  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    totalItems,
    completedItems,
    completionPercentage,
  };
}

/**
 * Determine inspection status based on completion percentage
 */
export function determineStatus(completionPercentage: number): ITPInspectionStatus {
  if (completionPercentage === 100) {
    return 'completed';
  } else if (completionPercentage > 0) {
    return 'in_progress';
  }
  return 'pending';
}

/**
 * Parse item ID into section and item components
 */
export function parseItemId(itemId: string): { sectionId: string; itemId: string } {
  const [sectionId, parsedItemId] = itemId.includes('-') ? itemId.split('-') : ['items', itemId];

  return { sectionId, itemId: parsedItemId };
}

/**
 * Create an ITP item result
 */
export function createItemResult(
  status: ITPItemStatus,
  notes: string,
  userId: string
): ITPItemResult {
  return {
    result: status,
    notes,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };
}
