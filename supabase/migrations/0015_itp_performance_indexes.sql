-- ITP Performance Optimization Indexes
-- Created: 2025-10-09
-- Purpose: Add composite indexes to optimize ITP assignment and query performance

-- ============================================================================
-- ITP Instances Indexes
-- ============================================================================

-- Composite index for checking existing assignments (lot_id + template_id)
-- Used in: /api/itp/instances/assign (duplicate check)
CREATE INDEX IF NOT EXISTS idx_itp_instances_lot_template
ON itp_instances(lot_id, template_id)
WHERE is_active = true;

-- Composite index for lot-based queries with project filter
-- Used in: /api/projects/[projectId]/lots/[lotId]/itp
CREATE INDEX IF NOT EXISTS idx_itp_instances_lot_project
ON itp_instances(lot_id, project_id)
WHERE is_active = true;

-- Index for organization-scoped queries
CREATE INDEX IF NOT EXISTS idx_itp_instances_organization
ON itp_instances(organization_id)
WHERE is_active = true;

-- Index for user-created instances lookup
CREATE INDEX IF NOT EXISTS idx_itp_instances_created_by
ON itp_instances(created_by, created_at DESC);

-- ============================================================================
-- ITP Templates Indexes
-- ============================================================================

-- Composite index for active template lookups by organization
-- Used in: /api/itp/templates (template list)
CREATE INDEX IF NOT EXISTS idx_itp_templates_org_active
ON itp_templates(organization_id, is_active)
WHERE deleted_at IS NULL;

-- Index for template category filtering
CREATE INDEX IF NOT EXISTS idx_itp_templates_category
ON itp_templates(category)
WHERE is_active = true AND deleted_at IS NULL;

-- ============================================================================
-- Lots and Projects Indexes
-- ============================================================================

-- Composite index for lot lookups with project validation
-- Used in: /api/itp/instances/assign (lot verification)
CREATE INDEX IF NOT EXISTS idx_lots_project_id
ON lots(project_id, id);

-- ============================================================================
-- Organization Members Index
-- ============================================================================

-- Composite index for membership lookups
-- Used in: /api/itp/instances/assign (permission check)
CREATE INDEX IF NOT EXISTS idx_organization_members_org_user
ON organization_members(organization_id, user_id);

-- ============================================================================
-- Performance Analysis
-- ============================================================================

COMMENT ON INDEX idx_itp_instances_lot_template IS
'Optimizes duplicate template assignment checks. Expected to reduce query time from ~50ms to <5ms';

COMMENT ON INDEX idx_itp_instances_lot_project IS
'Optimizes lot-scoped ITP instance queries. Expected to reduce query time from ~80ms to <10ms';

COMMENT ON INDEX idx_itp_templates_org_active IS
'Optimizes template list queries by organization. Expected to reduce query time from ~100ms to <15ms';

COMMENT ON INDEX idx_lots_project_id IS
'Optimizes lot verification queries. Expected to reduce query time from ~60ms to <8ms';
