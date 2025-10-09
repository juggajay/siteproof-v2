-- Emergency Production Fixes
-- Run these commands to fix the current production issues

-- ============================================================================
-- 1. RESTORE PROJECTS - Refresh materialized view
-- ============================================================================

-- Refresh the materialized view to show projects again
REFRESH MATERIALIZED VIEW CONCURRENTLY project_dashboard_stats;

-- Verify projects are now visible
SELECT COUNT(*) as total_projects FROM project_dashboard_stats;

-- ============================================================================
-- 2. FIX ITP INSTANCES - Apply missing migration 0011
-- ============================================================================

-- Check if deleted_at column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'itp_instances'
AND column_name = 'deleted_at';

-- If the above query returns no rows, the column doesn't exist
-- Apply migration 0011 to add missing columns:

-- Add missing columns if they don't exist
ALTER TABLE itp_instances
ADD COLUMN IF NOT EXISTS inspection_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE itp_instances
ADD COLUMN IF NOT EXISTS inspection_date TIMESTAMPTZ;

ALTER TABLE itp_instances
ADD COLUMN IF NOT EXISTS evidence_files JSONB DEFAULT '[]'::jsonb;

ALTER TABLE itp_instances
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'synced';

ALTER TABLE itp_instances
ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE itp_instances
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE itp_instances
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Update existing records to have inspection_status if they only have status
UPDATE itp_instances
SET inspection_status = COALESCE(inspection_status, status, 'pending')
WHERE inspection_status IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_itp_instances_inspection_status
ON itp_instances(inspection_status)
WHERE deleted_at IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN itp_instances.inspection_status IS 'Current inspection status: pending, in_progress, completed, approved';
COMMENT ON COLUMN itp_instances.evidence_files IS 'Array of file URLs for evidence photos/documents';
COMMENT ON COLUMN itp_instances.sync_status IS 'Sync status for offline support: synced, pending, error';

-- ============================================================================
-- 3. VERIFY FIXES
-- ============================================================================

-- Check projects are visible
SELECT project_id, project_name, total_lots, pending_lots
FROM project_dashboard_stats
LIMIT 5;

-- Check ITP instances can be queried
SELECT id, template_id, lot_id, inspection_status, created_at
FROM itp_instances
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Production fixes applied successfully!';
  RAISE NOTICE '📊 Projects should now be visible';
  RAISE NOTICE '📋 ITP instances should now be queryable';
END $$;
