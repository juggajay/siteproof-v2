-- ============================================
-- TEST SCRIPT FOR SPECIFIC REPORT DELETION
-- ============================================
-- Report ID: 59e12281-a1b2-4202-b026-eddf8d9cdb30
-- Run this in Supabase SQL Editor to test and fix

-- ============================================
-- 1. CHECK IF REPORT EXISTS
-- ============================================
\echo '=== Checking if report exists ==='

SELECT
  id,
  report_name,
  organization_id,
  requested_by,
  status,
  created_at
FROM report_queue
WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30';

-- ============================================
-- 2. CHECK CURRENT USER CONTEXT
-- ============================================
\echo '=== Current user context ==='

SELECT
  auth.uid() as current_user_id,
  auth.role() as current_role,
  current_user as database_user;

-- ============================================
-- 3. CHECK USER'S ORGANIZATION MEMBERSHIP
-- ============================================
\echo '=== User organization membership ==='

WITH report_org AS (
  SELECT organization_id, requested_by
  FROM report_queue
  WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30'
)
SELECT
  om.organization_id,
  om.role as user_role,
  o.name as org_name,
  ro.organization_id = om.organization_id as is_report_org,
  ro.requested_by = auth.uid() as owns_report
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
LEFT JOIN report_org ro ON true
WHERE om.user_id = auth.uid();

-- ============================================
-- 4. TEST DELETE PERMISSION LOGIC
-- ============================================
\echo '=== Testing delete permission logic ==='

WITH permission_check AS (
  SELECT
    rq.id,
    rq.report_name,
    rq.requested_by,
    rq.organization_id,
    -- Check condition 1: User owns the report
    rq.requested_by = auth.uid() as owns_report,
    -- Check condition 2: User is in the organization
    EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = rq.organization_id
        AND om.user_id = auth.uid()
    ) as in_organization,
    -- Get user's role if in organization
    (
      SELECT om.role
      FROM organization_members om
      WHERE om.organization_id = rq.organization_id
        AND om.user_id = auth.uid()
    ) as user_role_in_org
  FROM report_queue rq
  WHERE rq.id = '59e12281-a1b2-4202-b026-eddf8d9cdb30'
)
SELECT
  *,
  CASE
    WHEN owns_report THEN 'YES - User owns the report'
    WHEN in_organization THEN 'YES - User is in organization'
    ELSE 'NO - User cannot delete'
  END as can_delete_reason
FROM permission_check;

-- ============================================
-- 5. CHECK CURRENT RLS POLICIES
-- ============================================
\echo '=== Current RLS DELETE policies ==='

SELECT
  polname as policy_name,
  pg_get_expr(polqual, polrelid) as policy_condition
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';  -- DELETE command

-- ============================================
-- 6. ATTEMPT DELETION WITH DETAILED ERROR CAPTURE
-- ============================================
\echo '=== Attempting to delete report ==='

DO $$
DECLARE
  v_deleted_count INTEGER;
  v_report_exists BOOLEAN;
  v_user_id UUID;
  v_report RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Check if report exists
  SELECT * INTO v_report
  FROM report_queue
  WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30';

  IF NOT FOUND THEN
    RAISE NOTICE 'Report does not exist (may have been already deleted)';
    RETURN;
  END IF;

  RAISE NOTICE 'Report found: % (org: %, owner: %)',
    v_report.report_name,
    v_report.organization_id,
    v_report.requested_by;

  -- Try to delete
  DELETE FROM report_queue
  WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS: Report deleted! (deleted % rows)', v_deleted_count;
  ELSE
    RAISE NOTICE '❌ FAILED: Could not delete report (RLS policy blocked it)';

    -- Debug why it failed
    IF v_report.requested_by = v_user_id THEN
      RAISE NOTICE 'Strange: User owns the report but still cannot delete';
    ELSIF EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = v_report.organization_id
        AND user_id = v_user_id
    ) THEN
      RAISE NOTICE 'Strange: User is in organization but still cannot delete';
      RAISE NOTICE 'This suggests the RLS policy is not working correctly';
    ELSE
      RAISE NOTICE 'Expected: User is not owner and not in organization';
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error during deletion: %', SQLERRM;
END $$;

-- ============================================
-- 7. IF DELETION FAILED, USE DEBUG FUNCTION
-- ============================================
\echo '=== Using debug function ==='

-- First create the debug function if it doesn't exist
CREATE OR REPLACE FUNCTION test_delete_permission(p_report_id UUID)
RETURNS JSON AS $$
DECLARE
  v_report RECORD;
  v_user_id UUID;
  v_owns BOOLEAN;
  v_in_org BOOLEAN;
  v_user_role TEXT;
BEGIN
  v_user_id := auth.uid();

  -- Get report
  SELECT * INTO v_report
  FROM report_queue
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Report not found');
  END IF;

  -- Check ownership
  v_owns := (v_report.requested_by = v_user_id);

  -- Check organization membership
  v_in_org := EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = v_report.organization_id
      AND user_id = v_user_id
  );

  -- Get user role
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE organization_id = v_report.organization_id
    AND user_id = v_user_id;

  RETURN json_build_object(
    'report_id', v_report.id,
    'report_name', v_report.report_name,
    'report_org', v_report.organization_id,
    'report_owner', v_report.requested_by,
    'current_user', v_user_id,
    'user_owns_report', v_owns,
    'user_in_organization', v_in_org,
    'user_role', v_user_role,
    'should_be_able_to_delete', (v_owns OR v_in_org),
    'policy_allows_delete', CASE
      WHEN v_owns THEN 'Should allow - user owns report'
      WHEN v_in_org THEN 'Should allow - user in organization'
      ELSE 'Should deny - no permission'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the debug function
SELECT test_delete_permission('59e12281-a1b2-4202-b026-eddf8d9cdb30'::uuid);

-- ============================================
-- 8. EMERGENCY FIX - RECREATE POLICY
-- ============================================
\echo '=== Emergency fix: Recreating DELETE policy ==='

-- Drop all DELETE policies
DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;
DROP POLICY IF EXISTS "report_queue_delete_allow_org_members" ON report_queue;
DROP POLICY IF EXISTS "report_queue_delete_final" ON report_queue;
DROP POLICY IF EXISTS "report_queue_delete_policy" ON report_queue;
DROP POLICY IF EXISTS "allow_delete_own_or_org_reports" ON report_queue;

-- Create a simple, working DELETE policy
CREATE POLICY "simple_delete_policy"
ON report_queue
FOR DELETE
TO authenticated
USING (
  requested_by = auth.uid()
  OR
  organization_id::text IN (
    SELECT organization_id::text
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

\echo '=== Testing with new policy ==='

-- Try deletion again
DELETE FROM report_queue
WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30'
RETURNING id, report_name as deleted_report;

-- ============================================
-- 9. FINAL CHECK
-- ============================================
\echo '=== Final check ==='

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM report_queue
      WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30'
    ) THEN '❌ REPORT STILL EXISTS - Deletion failed'
    ELSE '✅ REPORT DELETED SUCCESSFULLY'
  END as final_status;

-- ============================================
-- 10. NUCLEAR OPTION - FORCE DELETE (LAST RESORT)
-- ============================================
-- Uncomment ONLY if all else fails and you need to delete the report:
/*
\echo '=== NUCLEAR OPTION: Force deleting with elevated privileges ==='

CREATE OR REPLACE FUNCTION emergency_delete_report()
RETURNS TEXT AS $$
BEGIN
  DELETE FROM report_queue
  WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30';

  IF FOUND THEN
    RETURN 'Report forcefully deleted';
  ELSE
    RETURN 'Report not found or already deleted';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT emergency_delete_report();
DROP FUNCTION emergency_delete_report();
*/