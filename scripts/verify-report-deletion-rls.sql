-- ============================================
-- Verify Report Deletion RLS Configuration
-- ============================================
-- Run this script to check if migration 0031 is correctly applied
-- and to diagnose any permission issues

\echo '=========================================='
\echo 'STEP 1: Check DELETE Policies on report_queue'
\echo '=========================================='

-- Should show ONLY ONE policy: report_queue_delete_allow_org_members
SELECT
  '=== DELETE Policies ===' as info,
  polname as policy_name,
  pg_get_expr(polqual, polrelid) as using_clause,
  polcmd as command
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd'
ORDER BY polname;

\echo ''
\echo '=========================================='
\echo 'STEP 2: Count DELETE Policies (should be 1)'
\echo '=========================================='

SELECT
  COUNT(*) as delete_policy_count,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ NO DELETE POLICY - Migration 0031 not applied'
    WHEN COUNT(*) = 1 THEN '✅ Exactly one DELETE policy (correct)'
    ELSE '⚠️  Multiple DELETE policies - conflict detected'
  END as status
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';

\echo ''
\echo '=========================================='
\echo 'STEP 3: Check All Policies on report_queue'
\echo '=========================================='

-- Show all policies for context
SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'w' THEN 'INSERT'
    WHEN 'u' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    ELSE 'ALL'
  END as operation,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY
  CASE polcmd
    WHEN 'r' THEN 1
    WHEN 'w' THEN 2
    WHEN 'u' THEN 3
    WHEN 'd' THEN 4
    ELSE 5
  END,
  polname;

\echo ''
\echo '=========================================='
\echo 'STEP 4: Check if Helper Functions Exist'
\echo '=========================================='

-- Migration 0031 creates these helper functions
SELECT
  proname as function_name,
  CASE
    WHEN proname = 'debug_report_delete_permission' THEN '✅ Debug function exists'
    WHEN proname = 'force_delete_report' THEN '✅ Force delete function exists'
    ELSE proname
  END as status
FROM pg_proc
WHERE proname IN ('debug_report_delete_permission', 'force_delete_report')
ORDER BY proname;

\echo ''
\echo '=========================================='
\echo 'STEP 5: Test DELETE Permission (Example)'
\echo '=========================================='
\echo 'To test a specific report, run:'
\echo "  SELECT * FROM debug_report_delete_permission('<report-id>'::uuid);"
\echo ''
\echo 'Example with a real report:'

-- Get the most recent report
DO $$
DECLARE
  latest_report_id UUID;
BEGIN
  SELECT id INTO latest_report_id
  FROM report_queue
  ORDER BY requested_at DESC
  LIMIT 1;

  IF latest_report_id IS NOT NULL THEN
    RAISE NOTICE 'Latest report ID: %', latest_report_id;
    RAISE NOTICE 'Run this to debug: SELECT * FROM debug_report_delete_permission(''%''::uuid);', latest_report_id;
  ELSE
    RAISE NOTICE 'No reports found in database';
  END IF;
END $$;

\echo ''
\echo '=========================================='
\echo 'STEP 6: Check RLS is Enabled'
\echo '=========================================='

SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✅ RLS is enabled'
    ELSE '❌ RLS is DISABLED - security issue!'
  END as status
FROM pg_tables
WHERE tablename = 'report_queue';

\echo ''
\echo '=========================================='
\echo 'STEP 7: Sample Reports (Recent 5)'
\echo '=========================================='

SELECT
  id,
  report_name,
  status,
  requested_by,
  organization_id,
  requested_at
FROM report_queue
ORDER BY requested_at DESC
LIMIT 5;

\echo ''
\echo '=========================================='
\echo 'DIAGNOSTIC COMPLETE'
\echo '=========================================='
\echo ''
\echo 'Expected Results:'
\echo '  - Exactly ONE DELETE policy named: report_queue_delete_allow_org_members'
\echo '  - Both helper functions exist (debug_report_delete_permission, force_delete_report)'
\echo '  - RLS is enabled on report_queue table'
\echo ''
\echo 'If migration 0031 is NOT applied, run:'
\echo '  psql <connection-string> -f packages/database/migrations/0031_final_fix_report_delete_permissions.sql'
\echo ''
