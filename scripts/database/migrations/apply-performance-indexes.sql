-- Script to apply performance indexes to production database
-- Run this script against your production database to improve performance

-- Performance optimization indexes for ITP and related tables
-- This migration adds indexes to improve query performance

-- Indexes for itp_instances table
CREATE INDEX IF NOT EXISTS idx_itp_instances_lot_project 
  ON itp_instances(lot_id, project_id);

CREATE INDEX IF NOT EXISTS idx_itp_instances_status_updated 
  ON itp_instances(inspection_status, updated_at);

CREATE INDEX IF NOT EXISTS idx_itp_instances_completion 
  ON itp_instances(completion_percentage) 
  WHERE completion_percentage > 0;

CREATE INDEX IF NOT EXISTS idx_itp_instances_created_by 
  ON itp_instances(created_by, created_at);

CREATE INDEX IF NOT EXISTS idx_itp_instances_template 
  ON itp_instances(template_id, lot_id);

-- JSONB path indexes for commonly accessed data
CREATE INDEX IF NOT EXISTS idx_itp_instances_data_results 
  ON itp_instances USING GIN ((data -> 'inspection_results'));

CREATE INDEX IF NOT EXISTS idx_itp_instances_data_sections 
  ON itp_instances USING GIN (data);

-- Indexes for itp_templates table
CREATE INDEX IF NOT EXISTS idx_itp_templates_org_active 
  ON itp_templates(organization_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_itp_templates_category 
  ON itp_templates(category, is_active) 
  WHERE is_active = true;

-- JSONB index for template structure queries
CREATE INDEX IF NOT EXISTS idx_itp_templates_structure 
  ON itp_templates USING GIN (structure);

-- Indexes for lots table
CREATE INDEX IF NOT EXISTS idx_lots_project_status 
  ON lots(project_id, status);

CREATE INDEX IF NOT EXISTS idx_lots_project_created 
  ON lots(project_id, created_at DESC);

-- Indexes for projects table
CREATE INDEX IF NOT EXISTS idx_projects_org_status 
  ON projects(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_projects_org_created 
  ON projects(organization_id, created_at DESC);

-- Indexes for inspections table (if exists)
CREATE INDEX IF NOT EXISTS idx_inspections_lot 
  ON inspections(lot_id, status);

CREATE INDEX IF NOT EXISTS idx_inspections_inspector 
  ON inspections(inspector_id, inspection_date DESC);

-- Indexes for organization_members table
CREATE INDEX IF NOT EXISTS idx_org_members_user_org 
  ON organization_members(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_org_members_org_role 
  ON organization_members(organization_id, role);

-- Composite indexes for common JOIN patterns
CREATE INDEX IF NOT EXISTS idx_itp_instances_full_lookup 
  ON itp_instances(id, lot_id, template_id, inspection_status);

-- Partial indexes for common WHERE conditions
CREATE INDEX IF NOT EXISTS idx_itp_instances_in_progress 
  ON itp_instances(lot_id, updated_at DESC) 
  WHERE inspection_status = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_itp_instances_completed 
  ON itp_instances(lot_id, inspection_date DESC) 
  WHERE inspection_status IN ('completed', 'approved');

-- Function-based index for text search (if needed)
CREATE INDEX IF NOT EXISTS idx_itp_templates_name_search 
  ON itp_templates USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Update table statistics for query planner
ANALYZE itp_instances;
ANALYZE itp_templates;
ANALYZE lots;
ANALYZE projects;
ANALYZE organization_members;

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM 
    pg_indexes
WHERE 
    tablename IN ('itp_instances', 'itp_templates', 'lots', 'projects', 'organization_members')
    AND indexname LIKE 'idx_%'
ORDER BY 
    tablename, 
    indexname;