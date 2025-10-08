/**
 * Centralized Zod validation schemas for API routes
 * Ensures consistent input validation across the application
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * UUID validation schema
 * Used for validating ID parameters in API routes
 */
export const uuidSchema = z.string().uuid({
  message: 'Invalid UUID format',
});

/**
 * Path parameters schema for routes with ID
 */
export const idParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Date string schema (ISO 8601 format)
 */
export const dateSchema = z.string().datetime({
  message: 'Invalid date format. Expected ISO 8601 datetime string',
});

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Diary Schemas
// ============================================================================

/**
 * Trade entry schema for daily diaries
 */
export const tradeEntrySchema = z.object({
  trade: z.string().min(1).max(100),
  company_id: z.string().uuid().nullable().optional(),
  company: z.string().max(200).optional(),
  workers: z.number().int().min(1).max(1000),
  hourly_rate: z.number().min(0).max(10000).nullable().optional(),
  daily_rate: z.number().min(0).max(100000).nullable().optional(),
  total_cost: z.number().min(0).max(1000000).nullable().optional(),
});

/**
 * Labour entry schema
 */
export const labourEntrySchema = z.object({
  worker_id: z.string().uuid().nullable().optional(),
  employee_id: z.string().uuid().nullable().optional(),
  trade: z.string().min(1).max(100),
  company_id: z.string().uuid().nullable().optional(),
  worker_name: z.string().min(1).max(200),
  company: z.string().max(200).optional(),
  workers: z.number().int().min(1).max(100).default(1),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  break_duration: z.number().int().min(0).max(480).nullable().optional(), // minutes
  total_hours: z.number().min(0).max(24),
  overtime_hours: z.number().min(0).max(24).default(0),
  standard_rate: z.number().min(0).max(10000).nullable().optional(),
  overtime_rate: z.number().min(0).max(10000).nullable().optional(),
  total_cost: z.number().min(0).max(100000).nullable().optional(),
  work_performed: z.string().max(1000),
  location: z.string().max(200).nullable().optional(),
});

/**
 * Plant entry schema
 */
export const plantEntrySchema = z.object({
  equipment_id: z.string().uuid().nullable().optional(),
  equipment_name: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  type: z.string().max(100),
  quantity: z.number().int().min(1).max(1000).default(1),
  supplier_id: z.string().uuid().nullable().optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  total_hours: z.number().min(0).max(24).nullable().optional(),
  hours_used: z.number().min(0).max(24).nullable().optional(),
  operator_id: z.string().uuid().nullable().optional(),
  operator_name: z.string().max(200).nullable().optional(),
  hourly_rate: z.number().min(0).max(10000).nullable().optional(),
  fuel_cost: z.number().min(0).max(100000).nullable().optional(),
  total_cost: z.number().min(0).max(1000000).nullable().optional(),
  work_performed: z.string().max(1000),
  location: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/**
 * Material entry schema
 */
export const materialEntrySchema = z.object({
  material_id: z.string().uuid().nullable().optional(),
  material_name: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  supplier_id: z.string().uuid().nullable().optional(),
  supplier: z.string().max(200).optional(),
  quantity: z.number().min(0).max(1000000),
  unit_of_measure: z.string().min(1).max(50),
  unit: z.string().min(1).max(50),
  unit_cost: z.number().min(0).max(1000000).nullable().optional(),
  total_cost: z.number().min(0).max(10000000).nullable().optional(),
  delivery_time: z.string().nullable().optional(),
  delivery_location: z.string().max(500).nullable().optional(),
  delivery_note: z.string().max(1000).nullable().optional(),
  docket_number: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/**
 * Create diary schema
 */
export const createDiarySchema = z.object({
  diary_date: dateSchema,
  project_id: uuidSchema,
  work_summary: z.string().min(10).max(5000),
  weather: z
    .object({
      conditions: z.string().max(100),
      temperature: z.number().min(-50).max(60),
      wind_speed: z.number().min(0).max(200).optional(),
      humidity: z.number().min(0).max(100).optional(),
    })
    .optional(),
  trades_on_site: z.array(tradeEntrySchema).optional(),
  labour_entries: z.array(labourEntrySchema).optional(),
  plant_entries: z.array(plantEntrySchema).optional(),
  material_entries: z.array(materialEntrySchema).optional(),
  site_conditions: z.string().max(2000).optional(),
  safety_notes: z.string().max(2000).optional(),
  visitors: z.array(z.string().max(200)).optional(),
  photos: z.array(z.string().url()).optional(),
});

/**
 * Update diary schema (all fields optional)
 */
export const updateDiarySchema = createDiarySchema.partial();

// ============================================================================
// NCR Schemas
// ============================================================================

/**
 * Severity levels for NCRs
 */
export const severitySchema = z.enum(['low', 'medium', 'high', 'critical']);

/**
 * NCR status
 */
export const ncrStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed', 'rejected']);

/**
 * Create NCR schema
 */
export const createNcrSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  severity: severitySchema,
  project_id: uuidSchema,
  location: z.string().max(500).optional(),
  detected_date: dateSchema.optional(),
  category: z.string().max(100).optional(),
  assigned_to: uuidSchema.optional(),
  due_date: dateSchema.optional(),
  photos: z.array(z.string().url()).max(10).optional(),
  attachments: z.array(z.string().url()).max(5).optional(),
});

/**
 * Update NCR schema
 */
export const updateNcrSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(20).max(5000).optional(),
  severity: severitySchema.optional(),
  status: ncrStatusSchema.optional(),
  location: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  assigned_to: uuidSchema.nullable().optional(),
  due_date: dateSchema.nullable().optional(),
  resolution_notes: z.string().max(5000).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
  attachments: z.array(z.string().url()).max(5).optional(),
});

// ============================================================================
// Organization Schemas
// ============================================================================

/**
 * Organization role schema
 */
export const organizationRoleSchema = z.enum([
  'owner',
  'admin',
  'project_manager',
  'site_foreman',
  'finance_manager',
  'accountant',
  'viewer',
]);

/**
 * Invite member schema
 */
export const inviteMemberSchema = z.object({
  email: z.string().email().max(255),
  role: organizationRoleSchema,
  project_ids: z.array(uuidSchema).optional(),
});

/**
 * Update member role schema
 */
export const updateMemberRoleSchema = z.object({
  role: organizationRoleSchema,
});

// ============================================================================
// Project Schemas
// ============================================================================

/**
 * Project status schema
 */
export const projectStatusSchema = z.enum([
  'planning',
  'active',
  'on_hold',
  'completed',
  'cancelled',
]);

/**
 * Create project schema
 */
export const createProjectSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  client_name: z.string().max(200).optional(),
  project_manager_id: uuidSchema.optional(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
  budget: z.number().min(0).max(1000000000).optional(),
  location: z.string().max(500).optional(),
  status: projectStatusSchema.default('planning'),
});

/**
 * Update project schema
 */
export const updateProjectSchema = createProjectSchema.partial();

// ============================================================================
// Report Schemas
// ============================================================================

/**
 * Report type schema
 */
export const reportTypeSchema = z.enum([
  'daily_diary',
  'daily_diary_entry',
  'ncr_summary',
  'itp_report',
  'project_summary',
  'financial_summary',
]);

/**
 * Report format schema
 */
export const reportFormatSchema = z.enum(['pdf', 'excel', 'csv']);

/**
 * Request report schema
 */
export const requestReportSchema = z.object({
  report_type: reportTypeSchema,
  format: reportFormatSchema,
  project_id: uuidSchema,
  date_range: z
    .object({
      start: dateSchema,
      end: dateSchema,
    })
    .optional(),
  filters: z.record(z.any()).optional(),
});

// ============================================================================
// ITP Schemas
// ============================================================================

/**
 * ITP status schema
 */
export const itpStatusSchema = z.enum([
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'archived',
]);

/**
 * ITP template schema
 */
export const createItpTemplateSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100),
  trade: z.string().max(100).optional(),
  inspection_points: z
    .array(
      z.object({
        sequence: z.number().int().min(1),
        description: z.string().min(5).max(500),
        acceptance_criteria: z.string().max(1000),
        reference_documents: z.array(z.string().max(200)).optional(),
        hold_point: z.boolean().default(false),
      })
    )
    .min(1),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate and parse request body
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated data
 * @throws ZodError if validation fails
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safely validate request body and return result
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns SafeParseReturnType with success/error
 */
export function safeValidateRequest<T>(schema: z.ZodSchema<T>, data: unknown) {
  return schema.safeParse(data);
}

/**
 * Validate path parameters
 * @param params - Path parameters from Next.js route
 * @returns Validated params
 */
export function validateParams(params: { id: string }) {
  return idParamsSchema.parse(params);
}

/**
 * Validate pagination query params
 * @param searchParams - URL search parameters
 * @returns Validated pagination params
 */
export function validatePagination(searchParams: URLSearchParams) {
  return paginationSchema.parse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  });
}
