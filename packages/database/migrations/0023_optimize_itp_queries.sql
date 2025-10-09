-- Optimization indexes for ITP query performance
-- This migration adds covering indexes to improve ITP instances queries
-- Addresses N+1 query patterns and improves JOIN performance

-- Create covering index for common lot + template + status queries
-- INCLUDE clause adds frequently accessed columns for index-only scans
CREATE INDEX IF NOT EXISTS idx_itp_instances_lot_template_status
  ON itp_instances(lot_id, template_id, inspection_status)
  INCLUDE (created_at, updated_at);

-- Create index for template joins with organization filtering
-- Improves performance of queries that join templates with org access
CREATE INDEX IF NOT EXISTS idx_itp_templates_id_org
  ON itp_templates(id, organization_id)
  WHERE is_active = TRUE AND deleted_at IS NULL;

-- Create index for project + lot filtering pattern
-- Optimizes RLS policy checks with projects join
CREATE INDEX IF NOT EXISTS idx_itp_instances_project_lot
  ON itp_instances(project_id, lot_id)
  WHERE deleted_at IS NULL;

-- Add index for created_by queries (common in audit trails)
CREATE INDEX IF NOT EXISTS idx_itp_instances_created_by_date
  ON itp_instances(created_by, created_at DESC)
  WHERE deleted_at IS NULL;

-- Partial index for active (non-deleted) instances
-- Improves queries that filter out deleted records
CREATE INDEX IF NOT EXISTS idx_itp_instances_active
  ON itp_instances(lot_id, inspection_status, updated_at DESC)
  WHERE deleted_at IS NULL;

-- Update statistics for query planner
ANALYZE itp_instances;
ANALYZE itp_templates;
ANALYZE projects;

-- Add comments for documentation
COMMENT ON INDEX idx_itp_instances_lot_template_status IS 'Covering index for ITP list queries with status filtering. Includes frequently accessed columns for index-only scans.';

COMMENT ON INDEX idx_itp_templates_id_org IS 'Optimizes template joins with organization-based RLS checks. Filtered for active templates only.';

COMMENT ON INDEX idx_itp_instances_project_lot IS 'Optimizes RLS policy checks that require projects join. Filtered for non-deleted instances.';

COMMENT ON INDEX idx_itp_instances_created_by_date IS 'Supports audit trail queries and user activity tracking.';

COMMENT ON INDEX idx_itp_instances_active IS 'Partial index for active instances, optimizes common dashboard and list queries.';
