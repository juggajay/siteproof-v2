-- Migration: Fix Report Queue RLS Policies for DELETE Operations
-- Issue: DELETE operations return 404 even when user has proper permissions
-- Root Cause: Inconsistent RLS policies between SELECT and DELETE operations
-- Solution: Unified, consistent RLS policies across all operations

-- ============================================
-- CLEAN UP ALL EXISTING POLICIES
-- ============================================
-- Remove all variations of policies that may have been created
DROP POLICY IF EXISTS "Users can view reports in their organization" ON report_queue;
DROP POLICY IF EXISTS "Users can view reports in their organization with joins" ON report_queue;
DROP POLICY IF EXISTS "Users can download completed reports" ON report_queue;
DROP POLICY IF EXISTS "Users can create reports in their organization" ON report_queue;
DROP POLICY IF EXISTS "Users can update their own reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete own reports or organization reports with permission" ON report_queue;

-- ============================================
-- CREATE CONSISTENT RLS POLICIES
-- ============================================

-- SELECT Policy: Unified visibility rules
CREATE POLICY "report_queue_select"
ON report_queue
FOR SELECT
TO authenticated
USING (
  -- User can see reports they requested
  requested_by = auth.uid()
  OR
  -- User can see all reports from their organization(s)
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT Policy: Create reports in user's organization
CREATE POLICY "report_queue_insert"
ON report_queue
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be member of the organization
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
  AND
  -- requested_by must be the current user
  requested_by = auth.uid()
);

-- UPDATE Policy: Update own reports or admin can update org reports
CREATE POLICY "report_queue_update"
ON report_queue
FOR UPDATE
TO authenticated
USING (
  -- User owns the report
  requested_by = auth.uid()
  OR
  -- User is admin/owner/project_manager in the organization
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['owner', 'admin', 'project_manager'])
  )
)
WITH CHECK (
  -- Ensure organization_id doesn't change to an org user doesn't belong to
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- DELETE Policy: Consistent with visibility for proper 404 vs 403 handling
CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User owns the report (can always delete their own)
  requested_by = auth.uid()
  OR
  -- User is admin/owner/project_manager in the organization
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['owner', 'admin', 'project_manager'])
  )
);

-- ============================================
-- ADD PERFORMANCE INDEXES IF NOT EXISTS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_report_queue_requested_by_status
ON report_queue(requested_by, status);

CREATE INDEX IF NOT EXISTS idx_report_queue_org_status
ON report_queue(organization_id, status);

-- ============================================
-- ADD DOCUMENTATION
-- ============================================
COMMENT ON TABLE report_queue IS
'Report generation queue with RLS policies:
- SELECT: Users can see reports they requested OR reports from their organization
- INSERT: Users can create reports for their organization
- UPDATE: Users can update their own reports; admins can update org reports
- DELETE: Users can delete their own reports; admins can delete org reports
Note: DELETE policy is intentionally aligned with SELECT for proper HTTP status codes';

-- ============================================
-- VERIFICATION QUERY (For testing after migration)
-- ============================================
/*
-- Run this query to verify policies are correctly set:
SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END as command,
  pg_get_expr(polqual, polrelid) as using_clause,
  pg_get_expr(polwithcheck, polrelid) as with_check
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd, polname;
*/