/**
 * Database Type Definitions for SiteProof Web Application
 *
 * This file contains comprehensive type definitions for database entities,
 * API responses, and common data structures used throughout the application.
 *
 * Type Safety Rules:
 * 1. NO `any` types - use `unknown` when type is truly unknown
 * 2. ALL nullable fields explicitly marked with `| null`
 * 3. Use discriminated unions for status/state types
 * 4. Leverage Supabase-generated types when available
 */

// Re-export all database types from the shared package
export type {
  // Core entities
  Organization,
  User,
  OrganizationMember,
  Project,
  Lot,
  Comment,

  // ITP types
  ITPTemplate,
  ITPInstance,
  ITPAssignment,
  Inspection,
  InspectionAttachment,
  SyncConflict,

  // NCR types
  NCR,
  NCRHistory,
  NCRComment,

  // Daily Diary types
  DailyDiary,
  DiaryTemplate,
  DiaryAttachment,
  DiaryComment,
  DiaryLabor,
  DiaryPlant,
  DiaryMaterial,

  // Contractor types
  Contractor,
  Worker,
  PlantItem,
  Material,
  MaterialSupplier,

  // Notification types
  NotificationQueueItem,

  // Helper types
  UserRole,
  ProjectStatus,
  LotStatus,
  ITPStatus,
  NCRSeverity,
  NCRStatus,
  NCRPriority,
  InspectionStatus,
  ContractorType,
} from '@siteproof/database';

// =============================================================================
// REPORT TYPES
// =============================================================================

export type ReportType =
  | 'project_summary'
  | 'daily_diary_entry'
  | 'itp_report'
  | 'financial_summary'
  | 'ncr_summary'
  | 'inspection_summary';

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';

export type ReportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ReportQueueEntry {
  id: string;
  organization_id: string;
  report_type: ReportType;
  report_name: string;
  format: ReportFormat;
  parameters: ReportParameters;
  status: ReportStatus;
  progress: number;
  file_url: string | null;
  error_message: string | null;
  requested_by: string;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;

  // Joined data
  organization?: { name: string };
}

export type ReportParameters = {
  project_id?: string;
  project_name?: string;
  date_range?: {
    start: string;
    end: string;
  };
  lot_id?: string;
  lot_number?: string;
  diary_id?: string;
  organization_name?: string;
  itp_instances?: Array<{
    id: string;
    template_name: string;
    inspection_status: string;
    inspection_date: string | null;
  }>;
};

export interface ProjectData {
  id: string;
  name: string;
  code?: string | null;
  client_name?: string | null;
  client_company?: string | null;
  status: 'active' | 'completed' | 'archived';
  start_date?: string | null;
  due_date?: string | null;
}

export interface DiaryData {
  id: string;
  diary_number: string;
  diary_date: string;
  work_summary?: string | null;
  activities?: string | null;
  workforce_count?: number;
  total_workers?: number;
  weather?: {
    conditions?: string;
    temperature?: { min: number; max: number };
    wind?: string;
  };
  site_conditions?: string | null;
  access_issues?: string | null;
  trades_on_site?: string[];
  general_notes?: string | null;
  tomorrow_planned_work?: string | null;
  notes_for_tomorrow?: string | null;
  safety_incidents?: unknown[];
  inspections?: unknown[];
}

export interface InspectionData {
  id: string;
  created_at: string;
  status: 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  result?: string | null;
  inspection_status?: string;
  inspection_date?: string | null;
  template_name?: string;
}

export interface NCRData {
  id: string;
  ncr_number: string;
  title: string;
  description: string;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed' | 'disputed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  category?: string;
  location?: string | null;
  trade?: string | null;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Standard API Success Response
 */
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

/**
 * Standard API Error Response
 */
export type ApiErrorResponse = {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
};

/**
 * Combined API Response Type
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Paginated API Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Type guard for API success responses
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard for API error responses
 */
export function isApiError<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false;
}

// =============================================================================
// SUPABASE QUERY TYPES
// =============================================================================

/**
 * NCR with joined relationships
 */
export interface NCRWithRelations extends NCRData {
  project?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  raisedBy?: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  assignedTo?: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
}

/**
 * Daily Diary with joined relationships
 */
export interface DiaryWithRelations extends DiaryData {
  project?: {
    id: string;
    name: string;
  } | null;
  createdBy?: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
}

/**
 * Lot with joined relationships
 */
export interface LotWithRelations {
  id: string;
  project_id: string;
  lot_number: number;
  name: string | null;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  project?: {
    id: string;
    name: string;
  } | null;
  itp_instances?: Array<{
    id: string;
    status: 'draft' | 'in_progress' | 'completed' | 'approved';
    completion_percentage: number;
  }>;
}

// =============================================================================
// REPORT GENERATION TYPES
// =============================================================================

export interface ReportGenerationData {
  project: ProjectData;
  organization: string;
  dateRange: {
    start: string;
    end: string;
  };
  diaries: DiaryData[];
  inspections: InspectionData[];
  ncrs: NCRData[];
}

export interface FinancialSummaryDateRange {
  start: string;
  end: string;
}

export interface FinancialSummaryTotals {
  labourHours: number;
  labourCost: number;
  plantHours: number;
  plantCost: number;
  materialCost: number;
  materialQuantity: number;
  totalCost: number;
}

export interface FinancialSummaryLabourEntry {
  id: string;
  workerId: string | null;
  workerName: string;
  company: string | null;
  jobTitle: string | null;
  hoursWorked: number;
  hourlyRate: number;
  cost: number;
  notes: string | null;
}

export interface FinancialSummaryPlantEntry {
  id: string;
  plantId: string | null;
  plantName: string;
  company: string | null;
  hoursUsed: number;
  hourlyRate: number;
  cost: number;
  notes: string | null;
}

export interface FinancialSummaryMaterialEntry {
  id: string;
  materialId: string | null;
  materialName: string;
  supplierName: string | null;
  quantity: number;
  unit: string | null;
  unitCost: number;
  totalCost: number;
  notes: string | null;
}

export interface FinancialSummaryDiary {
  id: string;
  diaryDate: string;
  diaryNumber: string | null;
  workSummary: string | null;
  labour: FinancialSummaryLabourEntry[];
  plant: FinancialSummaryPlantEntry[];
  materials: FinancialSummaryMaterialEntry[];
  totals: FinancialSummaryTotals;
}

export interface FinancialSummaryData {
  project: ProjectData;
  organization: string;
  dateRange: FinancialSummaryDateRange;
  totals: FinancialSummaryTotals;
  diaries: FinancialSummaryDiary[];
}

// =============================================================================
// WORKER AND MATERIAL TYPES (for reports)
// =============================================================================

export interface WorkerData {
  id: string;
  name?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  role?: string | null;
  hourly_rate?: number | null;
  standard_hourly_rate?: number | null;
  contractor?: {
    name: string;
  } | null;
}

export interface PlantItemData {
  id: string;
  name: string;
  hourly_rate?: number | null;
  standard_hourly_rate?: number | null;
  contractor?: {
    name: string;
  } | null;
}

export interface MaterialData {
  id: string;
  name: string;
  unit_cost?: number | null;
  unit_of_measure?: string | null;
  costs?: Array<{
    unit_cost: number;
    effective_from?: string | null;
    created_at?: string | null;
  }>;
}

export interface DiaryLaborEntry {
  id: string;
  diary_id: string;
  hours_worked: number;
  notes?: string | null;
  worker?: WorkerData | null;
}

export interface DiaryPlantEntry {
  id: string;
  diary_id: string;
  hours_used?: number | null;
  total_hours?: number | null;
  hourly_rate?: number | null;
  notes?: string | null;
  name?: string | null;
  plant_item?: PlantItemData | null;
}

export interface DiaryMaterialEntryDetailed {
  id: string;
  diary_id: string;
  material_id?: string | null;
  material_name?: string | null;
  quantity: number;
  unit?: string | null;
  unit_cost?: number | null;
  supplier_name?: string | null;
  notes?: string | null;
  material?: MaterialData | null;
}

// =============================================================================
// PDF GENERATION TYPES
// =============================================================================

export interface PDFTextOptions {
  size?: number;
  font?: unknown; // pdf-lib font object
  color?: { red: number; green: number; blue: number };
}

export interface PDFGenerationOptions {
  includeImages?: boolean;
  includeSignatures?: boolean;
  watermark?: string;
  pageSize?: 'A4' | 'Letter';
}

// =============================================================================
// TYPE UTILITIES
// =============================================================================

/**
 * Make specific properties required
 */
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific properties optional
 */
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract non-nullable properties
 */
export type NonNullableFields<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

/**
 * Database insert type (omits auto-generated fields)
 */
export type DbInsert<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * Database update type (all fields optional except id)
 */
export type DbUpdate<T> = Partial<Omit<T, 'id' | 'created_at'>> & { id: string };
