-- ============================================
-- Diagnostic Script for Report Queue DELETE Issue
-- ============================================
-- Purpose: Diagnose why DELETE operations return deletedCount: 0
-- Run this in your Supabase SQL Editor
--
-- INSTRUCTIONS:
-- 1. Replace USER_ID with the actual user UUID (from auth.users)
-- 2. Replace REPORT_ID with the report UUID that failed to delete
-- 3. Run each section separately and review the output
-- ============================================

\echo '=========================================='
\echo 'DIAGNOSTIC SCRIPT: Report Queue DELETE Issue'
\echo '=========================================='
\echo ''

-- ============================================
-- SECTION 1: Check if RLS is enabled
-- ============================================
\echo '1. Checking if RLS is enabled on report_queue...'
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✓ RLS is ENABLED'
    ELSE '✗ RLS is DISABLED (this could be the issue)'
  END as status
FROM pg_tables
WHERE tablename = 'report_queue';

\echo ''

-- ============================================
-- SECTION 2: List all RLS policies on report_queue
-- ============================================
\echo '2. Listing all RLS policies on report_queue...'
SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command_type,
  polpermissive as is_permissive,
  polroles::regrole[] as applies_to_roles,
  pg_get_expr(polqual, polrelid) as using_expression,
  CASE
    WHEN polcmd = 'd' THEN '✓ DELETE policy exists'
    ELSE ''
  END as delete_policy_status
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd, polname;

\echo ''

-- ============================================
-- SECTION 3: Check if DELETE policy exists
-- ============================================
\echo '3. Checking if DELETE policy exists...'
SELECT
  COUNT(*) as delete_policy_count,
  STRING_AGG(polname, ', ') as delete_policy_names,
  CASE
    WHEN COUNT(*) = 0 THEN '✗ NO DELETE POLICY - This is the problem!'
    WHEN COUNT(*) = 1 THEN '✓ DELETE policy exists'
    WHEN COUNT(*) > 1 THEN '⚠ Multiple DELETE policies - may cause conflicts'
  END as status
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';

\echo ''

-- ============================================
-- SECTION 4: Test specific user permissions
-- ============================================
-- ⚠️ REPLACE THESE VALUES BEFORE RUNNING!
\set user_id 'YOUR_USER_ID_HERE'
\set report_id 'YOUR_REPORT_ID_HERE'

\echo '4. Testing permissions for specific user and report...'
\echo 'User ID: ' :user_id
\echo 'Report ID: ' :report_id

-- Check if report exists and get details
SELECT
  '4a. Report Details' as section,
  rq.id,
  rq.report_name,
  rq.status,
  rq.requested_by,
  rq.organization_id,
  (rq.requested_by = :user_id::uuid) as user_is_owner,
  CASE
    WHEN rq.requested_by = :user_id::uuid THEN '✓ User owns this report'
    ELSE '✗ User does NOT own this report'
  END as ownership_status
FROM report_queue rq
WHERE rq.id = :report_id::uuid;

\echo ''

-- Check user's organization membership
SELECT
  '4b. User Organization Membership' as section,
  om.organization_id,
  om.role,
  o.name as organization_name,
  CASE
    WHEN om.role IN ('owner', 'admin', 'project_manager') THEN '✓ User has admin role'
    ELSE '✗ User is regular member'
  END as admin_status
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = :user_id::uuid;

\echo ''

-- Check if user can delete the report (theoretical)
SELECT
  '4c. DELETE Permission Analysis' as section,
  rq.id as report_id,
  rq.requested_by = :user_id::uuid as can_delete_as_owner,
  EXISTS(
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = :user_id::uuid
      AND om.organization_id = rq.organization_id
      AND om.role IN ('owner', 'admin', 'project_manager')
  ) as can_delete_as_admin,
  CASE
    WHEN rq.requested_by = :user_id::uuid THEN '✓ Can DELETE (owns report)'
    WHEN EXISTS(
      SELECT 1
      FROM organization_members om
      WHERE om.user_id = :user_id::uuid
        AND om.organization_id = rq.organization_id
        AND om.role IN ('owner', 'admin', 'project_manager')
    ) THEN '✓ Can DELETE (is org admin)'
    ELSE '✗ CANNOT DELETE (no permission)'
  END as permission_status
FROM report_queue rq
WHERE rq.id = :report_id::uuid;

\echo ''

-- ============================================
-- SECTION 5: Compare SELECT vs DELETE policies
-- ============================================
\echo '5. Comparing SELECT vs DELETE policy expressions...'

WITH policy_comparison AS (
  SELECT
    polname,
    CASE polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'd' THEN 'DELETE'
    END as operation,
    pg_get_expr(polqual, polrelid) as policy_expression
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass
    AND polcmd IN ('r', 'd')
)
SELECT
  operation,
  polname,
  LEFT(policy_expression, 100) || '...' as expression_preview
FROM policy_comparison
ORDER BY operation;

\echo ''

-- ============================================
-- SECTION 6: Recommended Actions
-- ============================================
\echo '6. Recommended Actions:'
\echo ''

DO $$
DECLARE
  delete_policy_count INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  -- Check DELETE policy count
  SELECT COUNT(*) INTO delete_policy_count
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass
    AND polcmd = 'd';

  -- Check RLS status
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE tablename = 'report_queue';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RECOMMENDATIONS:';
  RAISE NOTICE '========================================';

  IF NOT rls_enabled THEN
    RAISE NOTICE '⚠️  RLS is DISABLED on report_queue table';
    RAISE NOTICE '   Action: Enable RLS with: ALTER TABLE report_queue ENABLE ROW LEVEL SECURITY;';
  END IF;

  IF delete_policy_count = 0 THEN
    RAISE NOTICE '❌ NO DELETE POLICY found';
    RAISE NOTICE '   Action: Apply migration 0029_fix_report_queue_rls_final.sql';
    RAISE NOTICE '   Or run the quick fix SQL:';
    RAISE NOTICE '';
    RAISE NOTICE '   CREATE POLICY "report_queue_delete"';
    RAISE NOTICE '   ON report_queue FOR DELETE TO authenticated';
    RAISE NOTICE '   USING (';
    RAISE NOTICE '     requested_by = auth.uid() OR';
    RAISE NOTICE '     organization_id IN (';
    RAISE NOTICE '       SELECT organization_id FROM organization_members';
    RAISE NOTICE '       WHERE user_id = auth.uid()';
    RAISE NOTICE '       AND role = ANY(ARRAY[''owner'', ''admin'', ''project_manager''])';
    RAISE NOTICE '     )';
    RAISE NOTICE '   );';
  ELSIF delete_policy_count = 1 THEN
    RAISE NOTICE '✅ DELETE policy exists';
    RAISE NOTICE '   Issue may be with policy logic or user permissions';
    RAISE NOTICE '   Check Section 4 above for permission details';
  ELSE
    RAISE NOTICE '⚠️  Multiple DELETE policies found (% policies)', delete_policy_count;
    RAISE NOTICE '   Action: Consolidate to single DELETE policy';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

\echo ''
\echo 'Diagnostic script completed!'
\echo ''
\echo 'Next Steps:'
\echo '1. Review the output above'
\echo '2. If NO DELETE policy exists, apply the fix migration'
\echo '3. If DELETE policy exists but permission is denied, check org membership'
\echo '4. Re-run this script after applying fixes to verify'
\echo ''
