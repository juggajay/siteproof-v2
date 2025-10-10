-- Script to verify report_queue RLS policies
-- Run this to diagnose the current state of RLS policies

-- ============================================
-- 1. Show all RLS policies on report_queue
-- ============================================
\echo '=== Current RLS Policies on report_queue ==='
SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command,
  polpermissive as is_permissive,
  polroles::regrole[] as applies_to_roles,
  pg_get_expr(polqual, polrelid) as using_clause,
  pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd, polname;

-- ============================================
-- 2. Check for duplicate policies
-- ============================================
\echo ''
\echo '=== Checking for Duplicate Policy Names ==='
SELECT
  polname as policy_name,
  COUNT(*) as count
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
GROUP BY polname
HAVING COUNT(*) > 1;

-- ============================================
-- 3. Compare SELECT vs DELETE policies
-- ============================================
\echo ''
\echo '=== SELECT Policies ==='
SELECT
  polname,
  pg_get_expr(polqual, polrelid) as policy_definition
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'r'
ORDER BY polname;

\echo ''
\echo '=== DELETE Policies ==='
SELECT
  polname,
  pg_get_expr(polqual, polrelid) as policy_definition
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd'
ORDER BY polname;

-- ============================================
-- 4. Analyze policy complexity
-- ============================================
\echo ''
\echo '=== Policy Complexity Analysis ==='
SELECT
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END as command,
  COUNT(*) as policy_count,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_policy p2
      WHERE p2.polrelid = 'report_queue'::regclass
        AND p2.polcmd = pg_policy.polcmd
        AND pg_get_expr(p2.polqual, p2.polrelid) LIKE '%role%'
    ) THEN 'Has role checks'
    ELSE 'No role checks'
  END as role_check_status
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
GROUP BY polcmd, role_check_status
ORDER BY polcmd;

-- ============================================
-- 5. Check if RLS is enabled on the table
-- ============================================
\echo ''
\echo '=== RLS Status on report_queue ==='
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN 'RLS is enabled'
    ELSE 'WARNING: RLS is NOT enabled!'
  END as status
FROM pg_tables
WHERE tablename = 'report_queue';

-- ============================================
-- 6. Show sample reports (if any)
-- ============================================
\echo ''
\echo '=== Sample Reports (first 3) ==='
SELECT
  id,
  report_name,
  status,
  requested_by,
  organization_id,
  created_at
FROM report_queue
ORDER BY created_at DESC
LIMIT 3;

-- ============================================
-- 7. Diagnostic summary
-- ============================================
\echo ''
\echo '=== Diagnostic Summary ==='
SELECT
  'Total report_queue policies' as metric,
  COUNT(*)::text as value
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
UNION ALL
SELECT
  'SELECT policies',
  COUNT(*)::text
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass AND polcmd = 'r'
UNION ALL
SELECT
  'DELETE policies',
  COUNT(*)::text
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd'
UNION ALL
SELECT
  'INSERT policies',
  COUNT(*)::text
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass AND polcmd = 'a'
UNION ALL
SELECT
  'UPDATE policies',
  COUNT(*)::text
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass AND polcmd = 'w';

-- ============================================
-- 8. Check for the problematic report
-- ============================================
\echo ''
\echo '=== Checking for report ID: 59e12281-a1b2-4202-b026-eddf8d9cdb30 ==='
SELECT
  id,
  report_name,
  status,
  requested_by,
  organization_id,
  created_at,
  CASE
    WHEN requested_by IS NULL THEN 'WARNING: No owner set'
    ELSE 'Has owner'
  END as owner_status
FROM report_queue
WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30';

-- ============================================
-- 9. Recommendations
-- ============================================
\echo ''
\echo '=== Recommendations ==='
\echo 'If you see:'
\echo '  - Multiple DELETE policies: Apply migration 0030 to clean up'
\echo '  - DELETE policy with role checks but SELECT without: RLS policy mismatch (apply 0030)'
\echo '  - RLS not enabled: Enable RLS with: ALTER TABLE report_queue ENABLE ROW LEVEL SECURITY;'
\echo '  - No DELETE policy: Apply migration 0030'
\echo ''
\echo 'To apply the fix:'
\echo '  psql $DATABASE_URL -f packages/database/migrations/0030_fix_report_delete_rls_aligned.sql'
\echo ''
\echo 'To test deletion for a specific user and report:'
\echo '  SELECT can_delete_report(''<report_id>'', ''<user_id>'');'
