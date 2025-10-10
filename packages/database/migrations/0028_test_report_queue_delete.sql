-- Test script for report_queue DELETE policy
-- Run this AFTER applying 0028_fix_report_queue_delete_policy.sql

-- ============================================
-- SETUP: Create test data
-- ============================================

-- Get current user ID for testing
DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_other_user_id UUID;
  v_my_report_id UUID;
  v_other_report_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No authenticated user. Please authenticate first.';
    RETURN;
  END IF;

  RAISE NOTICE 'Testing as user: %', v_user_id;

  -- Get user's organization
  SELECT organization_id INTO v_org_id
  FROM organization_members
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'User is not part of any organization';
    RETURN;
  END IF;

  RAISE NOTICE 'User organization: %', v_org_id;

  -- Create a test report owned by current user
  INSERT INTO report_queue (
    organization_id,
    report_type,
    report_name,
    format,
    parameters,
    requested_by,
    status
  ) VALUES (
    v_org_id,
    'custom',
    'TEST - My Report (can delete)',
    'pdf',
    '{}'::jsonb,
    v_user_id,
    'completed'
  ) RETURNING id INTO v_my_report_id;

  RAISE NOTICE 'Created test report (owned by you): %', v_my_report_id;

  -- Get another user in the same org (if exists)
  SELECT user_id INTO v_other_user_id
  FROM organization_members
  WHERE organization_id = v_org_id
    AND user_id != v_user_id
  LIMIT 1;

  IF v_other_user_id IS NOT NULL THEN
    -- Create a test report owned by another user
    INSERT INTO report_queue (
      organization_id,
      report_type,
      report_name,
      format,
      parameters,
      requested_by,
      status
    ) VALUES (
      v_org_id,
      'custom',
      'TEST - Other User Report',
      'pdf',
      '{}'::jsonb,
      v_other_user_id,
      'completed'
    ) RETURNING id INTO v_other_report_id;

    RAISE NOTICE 'Created test report (owned by other user): %', v_other_report_id;
  END IF;
END $$;

-- ============================================
-- TEST 1: Check current user permissions
-- ============================================

SELECT
  '=== Current User Role ===' as test_section;

SELECT
  user_id,
  organization_id,
  role,
  CASE
    WHEN role IN ('owner', 'admin', 'project_manager') THEN 'Can delete any org report'
    ELSE 'Can only delete own reports'
  END as delete_permissions
FROM organization_members
WHERE user_id = auth.uid();

-- ============================================
-- TEST 2: Check permissions on test reports
-- ============================================

SELECT
  '=== Test Report Permissions ===' as test_section;

SELECT
  id,
  report_name,
  requested_by = auth.uid() as is_my_report,
  can_delete_report(id) as can_delete,
  status
FROM report_queue
WHERE report_name LIKE 'TEST - %'
ORDER BY created_at DESC;

-- ============================================
-- TEST 3: Use diagnostic view
-- ============================================

SELECT
  '=== Permissions View ===' as test_section;

SELECT
  id,
  report_name,
  is_owner,
  is_org_admin,
  can_delete
FROM report_queue_permissions
WHERE report_name LIKE 'TEST - %'
ORDER BY created_at DESC;

-- ============================================
-- TEST 4: Test DELETE on own report
-- ============================================

SELECT
  '=== Delete Own Report Test ===' as test_section;

-- Try to delete your own report
WITH deletion AS (
  DELETE FROM report_queue
  WHERE report_name = 'TEST - My Report (can delete)'
    AND requested_by = auth.uid()
  RETURNING id, report_name
)
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN 'SUCCESS: Deleted own report'
    ELSE 'FAILED: Could not delete own report'
  END as result,
  COUNT(*) as deleted_count
FROM deletion;

-- ============================================
-- TEST 5: Test DELETE on other's report (admin only)
-- ============================================

SELECT
  '=== Delete Other User Report Test ===' as test_section;

-- Check if current user is admin
DO $$
DECLARE
  v_role TEXT;
  v_deleted_count INT;
BEGIN
  -- Get current user's role
  SELECT role INTO v_role
  FROM organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Try to delete other user's report
  WITH deletion AS (
    DELETE FROM report_queue
    WHERE report_name = 'TEST - Other User Report'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deletion;

  IF v_role IN ('owner', 'admin', 'project_manager') THEN
    IF v_deleted_count > 0 THEN
      RAISE NOTICE 'SUCCESS: Admin/Owner/PM can delete other user reports';
    ELSE
      RAISE NOTICE 'WARNING: Admin/Owner/PM but could not delete - check if report exists';
    END IF;
  ELSE
    IF v_deleted_count = 0 THEN
      RAISE NOTICE 'SUCCESS: Non-admin cannot delete other user reports (as expected)';
    ELSE
      RAISE NOTICE 'ERROR: Non-admin was able to delete other user report!';
    END IF;
  END IF;
END $$;

-- ============================================
-- TEST 6: Verify helper functions
-- ============================================

SELECT
  '=== Helper Function Tests ===' as test_section;

-- Test both function signatures
SELECT
  'Single param function' as function_type,
  can_delete_report(id) as can_delete,
  COUNT(*) as report_count
FROM report_queue
WHERE report_name LIKE 'TEST - %'
GROUP BY can_delete;

-- ============================================
-- CLEANUP: Remove remaining test data
-- ============================================

SELECT
  '=== Cleanup ===' as test_section;

DELETE FROM report_queue
WHERE report_name LIKE 'TEST - %';

SELECT
  'Test complete. All test reports cleaned up.' as status;

-- ============================================
-- SUMMARY: Check if migration is working
-- ============================================

SELECT
  '=== Migration Status ===' as test_section;

-- Check if policy exists
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL as has_using_clause
FROM pg_policies
WHERE tablename = 'report_queue'
  AND cmd = 'DELETE';

-- Check if functions exist
SELECT
  proname as function_name,
  pronargs as num_arguments,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'can_delete_report'
ORDER BY pronargs;

-- Check if view exists
SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'report_queue_permissions';