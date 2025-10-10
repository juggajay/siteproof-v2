-- Fix Report Queue RLS DELETE Policy Issue
-- Problem: DELETE returns 404 even though user should have permission
-- Root Cause Analysis and Fix

-- ============================================
-- STEP 1: ANALYZE CURRENT POLICIES
-- ============================================

-- Show all current policies on report_queue
SELECT
  'CURRENT POLICIES' as section,
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END as command,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd, polname;

-- ============================================
-- STEP 2: IDENTIFY THE PROBLEM
-- ============================================

/*
The issue appears to be a mismatch between SELECT and DELETE policies:

From migration 0027:
- SELECT policy: "Users can view reports in their organization with joins"
  - Allows: organization_id IN (SELECT from organization_members) OR requested_by = auth.uid()

From migration 0028:
- DELETE policy: "Users can delete their own reports or org admin reports"
  - Allows: requested_by = auth.uid() OR organization_id IN (SELECT with role check)

The problem is that multiple SELECT policies may have been created from different migrations,
and they might be conflicting or the DELETE policy might be referencing the wrong conditions.
*/

-- ============================================
-- STEP 3: CLEAN UP EXISTING POLICIES
-- ============================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view reports in their organization" ON report_queue;
DROP POLICY IF EXISTS "Users can view reports in their organization with joins" ON report_queue;
DROP POLICY IF EXISTS "Users can download completed reports" ON report_queue;
DROP POLICY IF EXISTS "Users can create reports in their organization" ON report_queue;
DROP POLICY IF EXISTS "Users can update their own reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete own reports or organization reports with permission" ON report_queue;

-- ============================================
-- STEP 4: CREATE UNIFIED RLS POLICIES
-- ============================================

-- SELECT Policy: Users can see reports they requested OR reports from their organization
CREATE POLICY "report_queue_select"
ON report_queue
FOR SELECT
TO authenticated
USING (
  -- User requested this report
  requested_by = auth.uid()
  OR
  -- User is member of the organization
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT Policy: Users can create reports in their organization
CREATE POLICY "report_queue_insert"
ON report_queue
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be creating report for their organization
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
  AND
  -- requested_by must be the current user
  requested_by = auth.uid()
);

-- UPDATE Policy: Users can update their own reports or admin can update org reports
CREATE POLICY "report_queue_update"
ON report_queue
FOR UPDATE
TO authenticated
USING (
  -- User owns this report
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
  -- Same conditions for what they can update to
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- DELETE Policy: MUST match SELECT policy for consistency
-- This ensures that if a user can SELECT a report (to verify it exists),
-- they can also DELETE it if they have the right permissions
CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User owns this report
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
-- STEP 5: VERIFY THE POLICIES
-- ============================================

-- Show the new policies
SELECT
  'NEW POLICIES' as section,
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END as command,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd, polname;

-- ============================================
-- STEP 6: TEST THE POLICIES
-- ============================================

-- Create a function to test RLS policies for a specific user and report
CREATE OR REPLACE FUNCTION test_report_queue_rls(
  p_user_id UUID,
  p_report_id UUID
)
RETURNS TABLE(
  test_name TEXT,
  result BOOLEAN,
  details TEXT
) AS $$
DECLARE
  v_report RECORD;
  v_can_select BOOLEAN;
  v_can_delete BOOLEAN;
  v_user_role TEXT;
  v_is_owner BOOLEAN;
BEGIN
  -- Get report details
  SELECT * INTO v_report
  FROM report_queue
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'Report exists'::TEXT, FALSE, 'Report not found'::TEXT;
    RETURN;
  END IF;

  -- Check if user owns the report
  v_is_owner := (v_report.requested_by = p_user_id);

  -- Get user's role in the organization
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE user_id = p_user_id
    AND organization_id = v_report.organization_id;

  -- Test SELECT policy
  v_can_select := EXISTS (
    SELECT 1
    FROM report_queue
    WHERE id = p_report_id
      AND (
        requested_by = p_user_id
        OR
        organization_id IN (
          SELECT organization_id
          FROM organization_members
          WHERE user_id = p_user_id
        )
      )
  );

  RETURN QUERY SELECT
    'Can SELECT report'::TEXT,
    v_can_select,
    format('User owns: %s, In org: %s', v_is_owner, v_user_role IS NOT NULL)::TEXT;

  -- Test DELETE policy
  v_can_delete := EXISTS (
    SELECT 1
    FROM report_queue
    WHERE id = p_report_id
      AND (
        requested_by = p_user_id
        OR
        organization_id IN (
          SELECT organization_id
          FROM organization_members
          WHERE user_id = p_user_id
            AND role = ANY(ARRAY['owner', 'admin', 'project_manager'])
        )
      )
  );

  RETURN QUERY SELECT
    'Can DELETE report'::TEXT,
    v_can_delete,
    format('User owns: %s, Role: %s', v_is_owner, COALESCE(v_user_role, 'not in org'))::TEXT;

  -- Check policy consistency
  RETURN QUERY SELECT
    'Policy consistency'::TEXT,
    (v_can_select AND v_can_delete) OR (NOT v_can_select AND NOT v_can_delete),
    format('SELECT=%s, DELETE=%s', v_can_select, v_can_delete)::TEXT;

  -- Return details
  RETURN QUERY SELECT
    'Report details'::TEXT,
    TRUE,
    format('Report by: %s, Org: %s', v_report.requested_by, v_report.organization_id)::TEXT;

  RETURN QUERY SELECT
    'User details'::TEXT,
    TRUE,
    format('User: %s, Role: %s, Is owner: %s', p_user_id, COALESCE(v_user_role, 'none'), v_is_owner)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 7: PROVIDE USAGE EXAMPLES
-- ============================================

/*
-- To test a specific user and report:
SELECT * FROM test_report_queue_rls('user-uuid-here', 'report-uuid-here');

-- To find reports a user should be able to delete:
SELECT
  rq.id,
  rq.report_name,
  rq.requested_by = auth.uid() as is_owner,
  om.role as user_role,
  CASE
    WHEN rq.requested_by = auth.uid() THEN 'Owner'
    WHEN om.role IN ('owner', 'admin', 'project_manager') THEN 'Admin'
    ELSE 'No permission'
  END as delete_permission
FROM report_queue rq
LEFT JOIN organization_members om
  ON om.organization_id = rq.organization_id
  AND om.user_id = auth.uid()
WHERE rq.requested_by = auth.uid()
   OR om.user_id IS NOT NULL;

-- To debug why a specific delete fails:
-- 1. Check if user can SELECT the report
SELECT EXISTS (
  SELECT 1 FROM report_queue
  WHERE id = 'report-uuid-here'
) as can_see_report;

-- 2. Check if user meets DELETE criteria
SELECT
  id,
  requested_by = auth.uid() as owns_report,
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = report_queue.organization_id
      AND role IN ('owner', 'admin', 'project_manager')
  ) as is_admin
FROM report_queue
WHERE id = 'report-uuid-here';
*/

-- ============================================
-- STEP 8: CLEANUP TEST FUNCTION (OPTIONAL)
-- ============================================

-- Uncomment to remove the test function after debugging:
-- DROP FUNCTION IF EXISTS test_report_queue_rls(UUID, UUID);