export interface DatabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

export type DatabaseClient = any; // Will be properly typed when implementing

// Database schema types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  plan_type: 'free' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'cancelled' | 'past_due';
  subscription_ends_at: string | null;
  settings: Record<string, any>;
  deleted_at: string | null;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  preferences: Record<string, any>;
  last_seen_at: string;
  deleted_at: string | null;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: Record<string, any>;
  joined_at: string;
  invited_by: string | null;
  
  // Joined data
  user?: User;
  organization?: Organization;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  token: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  
  // Joined data
  organization?: Organization;
  inviter?: User;
}

// Helper types
export type UserRole = OrganizationMember['role'];
export type InvitationStatus = Invitation['status'];
export type PlanType = Organization['plan_type'];
export type SubscriptionStatus = Organization['subscription_status'];

// Project types
export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_company: string | null;
  status: 'active' | 'completed' | 'archived';
  visibility: 'private' | 'public' | 'password';
  password_hash: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  settings: Record<string, any>;
  deleted_at: string | null;
}

export interface Lot {
  id: string;
  project_id: string;
  lot_number: number;
  name: string | null;
  description: string | null;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  files: Array<{
    url: string;
    name: string;
    size: number;
    type: string;
  }>;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  internal_notes: string | null;
  client_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
  parent_lot_id: string | null;
  
  // Joined data
  project?: Project;
  reviewer?: User;
  creator?: User;
}

export interface Comment {
  id: string;
  lot_id: string;
  content: string;
  metadata: Record<string, any>;
  parent_comment_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  author_id: string | null;
  author_name: string | null;
  author_email: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Joined data
  author?: User;
  resolver?: User;
  replies?: Comment[];
}

export interface ProjectAccessToken {
  id: string;
  project_id: string;
  token: string;
  permissions: {
    view: boolean;
    comment: boolean;
  };
  expires_at: string | null;
  last_used_at: string | null;
  use_count: number;
  created_by: string;
  created_at: string;
  is_active: boolean;
}

export interface ProjectDashboardStats {
  organization_id: string;
  project_id: string;
  project_name: string;
  project_status: Project['status'];
  project_created_at: string;
  due_date: string | null;
  client_name: string | null;
  client_company: string | null;
  total_lots: number;
  pending_lots: number;
  in_review_lots: number;
  approved_lots: number;
  rejected_lots: number;
  total_comments: number;
  unresolved_comments: number;
  last_activity_at: string | null;
  progress_percentage: number;
}

// Helper types
export type ProjectStatus = Project['status'];
export type ProjectVisibility = Project['visibility'];
export type LotStatus = Lot['status'];

// ITP Template types
export interface ITPTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: string | null;
  structure: any; // JSONB structure
  is_active: boolean;
  version: number;
  usage_count: number;
  last_used_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ITPInstance {
  id: string;
  template_id: string;
  project_id: string;
  lot_id: string | null;
  name: string;
  data: Record<string, any>;
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  completion_percentage: number;
  started_at: string | null;
  completed_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  template?: ITPTemplate;
  project?: Project;
  lot?: Lot;
  approver?: User;
  creator?: User;
}

export type ITPStatus = ITPInstance['status'];

// Inspection types for offline-first functionality
export interface ITPAssignment {
  id: string;
  template_id: string;
  project_id: string;
  lot_id: string | null;
  assigned_to: string;
  assigned_by: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  
  // Joined data
  template?: ITPTemplate;
  project?: Project;
  lot?: Lot;
  assignedTo?: User;
  assignedBy?: User;
}

export interface Inspection {
  id: string;
  assignment_id: string | null;
  template_id: string;
  project_id: string;
  lot_id: string | null;
  inspector_id: string;
  data: Record<string, any>;
  status: 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  completion_percentage: number;
  started_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  client_id: string | null;
  last_synced_at: string | null;
  sync_version: number;
  created_at: string;
  updated_at: string;
  
  // Joined data
  assignment?: ITPAssignment;
  template?: ITPTemplate;
  project?: Project;
  lot?: Lot;
  inspector?: User;
  reviewer?: User;
}

export interface InspectionAttachment {
  id: string;
  inspection_id: string;
  field_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  metadata: Record<string, any>;
  uploaded_at: string;
  uploaded_by: string;
  client_id: string | null;
  is_synced: boolean;
  
  // Joined data
  inspection?: Inspection;
  uploader?: User;
}

export interface SyncConflict {
  id: string;
  inspection_id: string;
  server_data: Record<string, any>;
  client_data: Record<string, any>;
  conflict_type: string;
  detected_at: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution: 'server_wins' | 'client_wins' | 'merged' | null;
  merged_data: Record<string, any> | null;
  
  // Joined data
  inspection?: Inspection;
  resolver?: User;
}

// Helper types
export type AssignmentStatus = ITPAssignment['status'];
export type AssignmentPriority = ITPAssignment['priority'];
export type InspectionStatus = Inspection['status'];
export type ConflictResolution = SyncConflict['resolution'];

// NCR (Non-Conformance Report) types
export interface NCR {
  id: string;
  organization_id: string;
  project_id: string;
  lot_id: string | null;
  inspection_id: string | null;
  ncr_number: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  tags: string[];
  location: string | null;
  trade: string | null;
  evidence: Record<string, any>;
  inspection_item_ref: string | null;
  raised_by: string;
  assigned_to: string | null;
  contractor_id: string | null;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed' | 'disputed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  root_cause: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  due_date: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  verification_evidence: Record<string, any>;
  estimated_cost: number | null;
  actual_cost: number | null;
  cost_notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // Joined data
  raisedBy?: User;
  assignedTo?: User;
  verifiedBy?: User;
  project?: Project;
  lot?: Lot;
  inspection?: Inspection;
  contractor?: Organization;
}

export interface NCRHistory {
  id: string;
  ncr_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  performed_by: string;
  performed_at: string;
  comment: string | null;
  changes: Record<string, any>;
  attachments: Record<string, any>;
  
  // Joined data
  performedBy?: User;
  ncr?: NCR;
}

export interface NCRComment {
  id: string;
  ncr_id: string;
  content: string;
  is_internal: boolean;
  author_id: string;
  author_role: string | null;
  parent_comment_id: string | null;
  attachments: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Joined data
  author?: User;
  ncr?: NCR;
  replies?: NCRComment[];
}

export interface NotificationQueueItem {
  id: string;
  type: string;
  entity_type: string;
  entity_id: string;
  recipient_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  data: Record<string, any>;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  last_attempt_at: string | null;
  sent_at: string | null;
  error: string | null;
  scheduled_for: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  recipient?: User;
}

// Helper types
export type NCRSeverity = NCR['severity'];
export type NCRStatus = NCR['status'];
export type NCRPriority = NCR['priority'];
export type NotificationChannel = NotificationQueueItem['channel'];
export type NotificationStatus = NotificationQueueItem['status'];

// Daily Diary types
export interface DailyDiary {
  id: string;
  organization_id: string;
  project_id: string;
  diary_date: string;
  diary_number: string;
  weather: {
    temperature?: { min: number; max: number; unit: string };
    conditions?: string;
    description?: string;
    humidity?: number;
    wind?: { speed: number; direction: string; unit: string };
    precipitation?: { amount: number; probability: number };
    uv_index?: number;
    sunrise?: string;
    sunset?: string;
    fetched_at?: string;
    source?: string;
  };
  site_conditions: string | null;
  work_areas: string[];
  access_issues: string | null;
  work_summary: string;
  trades_on_site: Array<{
    trade: string;
    company: string;
    workers: number;
    activities: string[];
  }>;
  total_workers: number;
  key_personnel: Array<{
    name: string;
    role: string;
    company: string;
    hours: { start: string; end: string };
  }>;
  equipment_on_site: Array<{
    type: string;
    description: string;
    supplier: string;
    hours_used: number;
  }>;
  material_deliveries: Array<{
    material: string;
    quantity: string;
    supplier: string;
    time: string;
    location: string;
  }>;
  delays: Array<{
    type: 'Weather' | 'Equipment' | 'Material' | 'Labor' | 'Other';
    description: string;
    duration_hours: number;
    impact: 'Low' | 'Medium' | 'High';
  }>;
  safety_incidents: Array<{
    type: 'Near Miss' | 'Minor Injury' | 'Major Injury';
    description: string;
    action_taken: string;
    reported_to: string;
  }>;
  inspections: Array<{
    type: 'Safety' | 'Quality' | 'Client' | 'Authority';
    inspector: string;
    organization: string;
    findings: string;
    time: string;
  }>;
  visitors: Array<{
    name: string;
    company: string;
    purpose: string;
    time_in: string;
    time_out: string;
  }>;
  milestones_achieved: string[];
  progress_photos: Array<{
    url: string;
    caption: string;
    location: string;
    timestamp: string;
  }>;
  general_notes: string | null;
  tomorrow_planned_work: string | null;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  project?: Project;
  createdBy?: User;
  approvedBy?: User;
}

export interface DiaryTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  default_trades: any[];
  default_equipment: any[];
  common_work_items: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  createdBy?: User;
}

export interface DiaryAttachment {
  id: string;
  diary_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  category: 'photo' | 'document' | 'drawing' | 'other' | null;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  
  // Joined data
  diary?: DailyDiary;
  uploadedBy?: User;
}

export interface DiaryComment {
  id: string;
  diary_id: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  parent_comment_id: string | null;
  deleted_at: string | null;
  
  // Joined data
  diary?: DailyDiary;
  author?: User;
  replies?: DiaryComment[];
}

// Helper types
export type DelayType = DailyDiary['delays'][0]['type'];
export type DelayImpact = DailyDiary['delays'][0]['impact'];
export type SafetyIncidentType = DailyDiary['safety_incidents'][0]['type'];
export type InspectionType = DailyDiary['inspections'][0]['type'];
export type AttachmentCategory = DiaryAttachment['category'];