-- Comprehensive test suite for report_queue DELETE functionality
-- Run this AFTER applying one of the migration approaches

-- Setup: Create test data
DO $$
DECLARE
  v_org_id UUID;
  v_user1_id UUID;
  v_user2_id UUID;
  v_admin_id UUID;
  v_report1_id UUID;
  v_report2_id UUID;
  v_report3_id UUID;
BEGIN
  -- Create test organization
  INSERT INTO organizations (id, name, slug)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Test Org Delete', 'test-org-delete')
  ON CONFLICT (id) DO NOTHING;

  v_org_id := '11111111-1111-1111-1111-111111111111';

  -- Create test users
  v_user1_id := '22222222-2222-2222-2222-222222222222';
  v_user2_id := '33333333-3333-3333-3333-333333333333';
  v_admin_id := '44444444-4444-4444-4444-444444444444';

  -- Insert test users (if they don't exist)
  INSERT INTO users (id, email)
  VALUES
    (v_user1_id, 'user1-delete@test.com'),
    (v_user2_id, 'user2-delete@test.com'),
    (v_admin_id, 'admin-delete@test.com')
  ON CONFLICT (id) DO NOTHING;

  -- Setup organization memberships
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES
    (v_org_id, v_user1_id, 'member'),
    (v_org_id, v_user2_id, 'member'),
    (v_org_id, v_admin_id, 'admin')
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Create test reports
  INSERT INTO report_queue (id, organization_id, report_type, report_name, format, parameters, requested_by, status)
  VALUES
    ('55555555-5555-5555-5555-555555555555', v_org_id, 'project_summary', 'User1 Report', 'pdf', '{}', v_user1_id, 'queued'),
    ('66666666-6666-6666-6666-666666666666', v_org_id, 'project_summary', 'User2 Report', 'pdf', '{}', v_user2_id, 'queued'),
    ('77777777-7777-7777-7777-777777777777', v_org_id, 'project_summary', 'Admin Report', 'pdf', '{}', v_admin_id, 'queued')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Test data created successfully';
END $$;

-- Test 1: Check if policies are properly created
SELECT
  'DELETE Policy Check' AS test_name,
  COUNT(*) AS policy_count,
  string_agg(polname, ', ') AS policy_names
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'DELETE';

-- Test 2: Check if functions exist (if using function-based approach)
SELECT
  'Function Check' AS test_name,
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE proname IN ('can_delete_report', 'check_report_delete_permission')
ORDER BY proname;

-- Test 3: Check if views exist
SELECT
  'View Check' AS test_name,
  viewname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('report_queue_permissions', 'report_queue_debug');

-- Test 4: Test deletion as different users
-- This requires manually setting the auth context
DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Test 4a: User1 tries to delete their own report (should work)
  BEGIN
    -- Simulate user1 context
    PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

    DELETE FROM report_queue
    WHERE id = '55555555-5555-5555-5555-555555555555'
      AND requested_by = '22222222-2222-2222-2222-222222222222';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_deleted_count > 0 THEN
      RAISE NOTICE 'Test 4a PASSED: User1 can delete their own report';
      -- Restore the report for next tests
      INSERT INTO report_queue (id, organization_id, report_type, report_name, format, parameters, requested_by, status)
      VALUES ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'project_summary', 'User1 Report', 'pdf', '{}', '22222222-2222-2222-2222-222222222222', 'queued')
      ON CONFLICT (id) DO NOTHING;
    ELSE
      RAISE NOTICE 'Test 4a FAILED: User1 cannot delete their own report';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Test 4a ERROR: %', SQLERRM;
  END;

  -- Test 4b: User1 tries to delete User2's report (should fail)
  BEGIN
    -- Simulate user1 context
    PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

    DELETE FROM report_queue
    WHERE id = '66666666-6666-6666-6666-666666666666';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_deleted_count = 0 THEN
      RAISE NOTICE 'Test 4b PASSED: User1 cannot delete User2 report';
    ELSE
      RAISE NOTICE 'Test 4b FAILED: User1 was able to delete User2 report';
      -- Restore the report
      INSERT INTO report_queue (id, organization_id, report_type, report_name, format, parameters, requested_by, status)
      VALUES ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'project_summary', 'User2 Report', 'pdf', '{}', '33333333-3333-3333-3333-333333333333', 'queued')
      ON CONFLICT (id) DO NOTHING;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Test 4b: Exception (expected for RLS block): %', SQLERRM;
  END;

  -- Test 4c: Admin tries to delete User1's report (should work)
  BEGIN
    -- Simulate admin context
    PERFORM set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);

    DELETE FROM report_queue
    WHERE id = '55555555-5555-5555-5555-555555555555';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_deleted_count > 0 THEN
      RAISE NOTICE 'Test 4c PASSED: Admin can delete User1 report';
      -- Restore the report for cleanup
      INSERT INTO report_queue (id, organization_id, report_type, report_name, format, parameters, requested_by, status)
      VALUES ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'project_summary', 'User1 Report', 'pdf', '{}', '22222222-2222-2222-2222-222222222222', 'queued')
      ON CONFLICT (id) DO NOTHING;
    ELSE
      RAISE NOTICE 'Test 4c FAILED: Admin cannot delete User1 report';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Test 4c ERROR: %', SQLERRM;
  END;
END $$;

-- Test 5: Check the debug view (if it exists)
SELECT
  'Debug View Test' AS test_name,
  id,
  report_name,
  is_owner,
  has_admin_role,
  can_delete_calculated
FROM report_queue_debug
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
LIMIT 5;

-- Test 6: Test the debug function (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_report_delete_permission') THEN
    RAISE NOTICE 'Testing check_report_delete_permission function:';

    -- Test for each user and report combination
    PERFORM check_report_delete_permission(
      '55555555-5555-5555-5555-555555555555',
      '22222222-2222-2222-2222-222222222222'
    );

    RAISE NOTICE 'Function test completed';
  ELSE
    RAISE NOTICE 'check_report_delete_permission function not found';
  END IF;
END $$;

-- Cleanup: Remove test data
DO $$
BEGIN
  -- Delete test reports
  DELETE FROM report_queue
  WHERE organization_id = '11111111-1111-1111-1111-111111111111';

  -- Remove test organization members
  DELETE FROM organization_members
  WHERE organization_id = '11111111-1111-1111-1111-111111111111';

  -- Remove test organization
  DELETE FROM organizations
  WHERE id = '11111111-1111-1111-1111-111111111111';

  -- Note: We keep test users as they might be referenced elsewhere

  RAISE NOTICE 'Test data cleaned up';
END $$;

-- Summary
SELECT
  'Test Summary' AS info,
  'Check the NOTICE messages above for test results' AS instructions;