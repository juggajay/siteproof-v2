-- ============================================
-- COMPREHENSIVE RLS POLICY ANALYSIS FOR REPORT_QUEUE
-- ============================================

-- 1. List ALL current policies on report_queue
SELECT
  '=== ALL POLICIES ON REPORT_QUEUE ===' as info;

SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as operation,
  polpermissive as permissive,
  polroles::text[] as roles,
  pg_get_expr(polqual, polrelid) as using_clause,
  pg_get_expr(polwithcheck, polrelid) as with_check
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd, polname;

-- 2. Specific comparison of SELECT vs DELETE policies
SELECT
  '=== COMPARING SELECT AND DELETE POLICIES ===' as info;

WITH policies AS (
  SELECT
    polname,
    CASE polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'd' THEN 'DELETE'
    END as operation,
    pg_get_expr(polqual, polrelid) as using_clause
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass
    AND polcmd IN ('r', 'd')
)
SELECT * FROM policies ORDER BY operation;

-- 3. Check if multiple policies exist for same operation
SELECT
  '=== POLICY COUNT BY OPERATION ===' as info;

SELECT
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END as operation,
  COUNT(*) as policy_count,
  STRING_AGG(polname, ', ') as policy_names
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
GROUP BY polcmd
ORDER BY polcmd;

-- 4. Check what migrations have been applied
SELECT
  '=== MIGRATION HISTORY CHECK ===' as info;

-- Check if migrations table exists
SELECT
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'schema_migrations'
  ) as has_migrations_table;

-- If migrations table exists, show recent migrations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'schema_migrations'
  ) THEN
    RAISE NOTICE 'Checking applied migrations...';

    -- This would show migrations, but we need dynamic SQL
    EXECUTE 'SELECT version, executed_at FROM schema_migrations
             WHERE version LIKE ''%report%''
             ORDER BY executed_at DESC LIMIT 10';
  END IF;
END $$;

-- 5. Test access with a mock scenario
SELECT
  '=== ACCESS TEST SIMULATION ===' as info;

-- Show what the current policies would allow for different scenarios
WITH test_scenarios AS (
  SELECT 'User owns report' as scenario,
         'requested_by = auth.uid()' as condition
  UNION ALL
  SELECT 'User in same org (any role)',
         'organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())'
  UNION ALL
  SELECT 'User in same org (admin/owner only)',
         'organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''project_manager''))'
)
SELECT
  scenario,
  condition,
  CASE
    WHEN condition LIKE '%requested_by = auth.uid()%' THEN 'YES - in both SELECT and DELETE'
    WHEN condition LIKE '%role IN%' THEN 'Depends on policy version'
    ELSE 'YES - if member of organization'
  END as can_access
FROM test_scenarios;

-- 6. Check for any helper functions
SELECT
  '=== HELPER FUNCTIONS ===' as info;

SELECT
  proname as function_name,
  prorettype::regtype as return_type,
  pronargs as num_args
FROM pg_proc
WHERE proname IN ('current_org_id', 'current_user_role', 'debug_report_delete_permission', 'force_delete_report')
  AND pronamespace = 'public'::regnamespace;

-- 7. Analyze the exact DELETE policy structure
SELECT
  '=== DETAILED DELETE POLICY ANALYSIS ===' as info;

SELECT
  polname as policy_name,
  CASE
    WHEN pg_get_expr(polqual, polrelid) LIKE '%requested_by = auth.uid()%'
         AND pg_get_expr(polqual, polrelid) NOT LIKE '%role%'
    THEN 'PERMISSIVE - All org members can delete'
    WHEN pg_get_expr(polqual, polrelid) LIKE '%role = ANY%'
         OR pg_get_expr(polqual, polrelid) LIKE '%role IN%'
    THEN 'RESTRICTIVE - Only specific roles can delete'
    ELSE 'UNKNOWN - Manual review needed'
  END as policy_type,
  pg_get_expr(polqual, polrelid) as full_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';

-- 8. Check if RLS is enabled
SELECT
  '=== RLS STATUS ===' as info;

SELECT
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as force_rls
FROM pg_class
WHERE relname = 'report_queue';

-- 9. Summary and recommendations
SELECT
  '=== DIAGNOSIS SUMMARY ===' as info;

WITH policy_summary AS (
  SELECT
    COUNT(CASE WHEN polcmd = 'r' THEN 1 END) as select_policies,
    COUNT(CASE WHEN polcmd = 'd' THEN 1 END) as delete_policies,
    MAX(CASE WHEN polcmd = 'r' THEN pg_get_expr(polqual, polrelid) END) as select_clause,
    MAX(CASE WHEN polcmd = 'd' THEN pg_get_expr(polqual, polrelid) END) as delete_clause
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass
)
SELECT
  CASE
    WHEN select_policies = 0 THEN 'ERROR: No SELECT policy found!'
    WHEN delete_policies = 0 THEN 'ERROR: No DELETE policy found!'
    WHEN select_policies > 1 THEN 'WARNING: Multiple SELECT policies (' || select_policies || ')'
    WHEN delete_policies > 1 THEN 'WARNING: Multiple DELETE policies (' || delete_policies || ')'
    WHEN select_clause = delete_clause THEN 'GOOD: SELECT and DELETE policies match'
    WHEN select_clause LIKE '%organization_id IN%'
         AND delete_clause LIKE '%organization_id IN%'
         AND select_clause NOT LIKE '%role%'
         AND delete_clause LIKE '%role%'
    THEN 'MISMATCH: SELECT allows all org members, DELETE restricts by role'
    WHEN select_clause LIKE '%organization_id IN%'
         AND delete_clause LIKE '%organization_id IN%'
         AND select_clause NOT LIKE '%role%'
         AND delete_clause NOT LIKE '%role%'
    THEN 'ALIGNED: Both policies allow all org members'
    ELSE 'UNKNOWN: Manual comparison needed'
  END as diagnosis,
  select_policies,
  delete_policies
FROM policy_summary;

-- 10. Test with actual data (if any exists)
SELECT
  '=== SAMPLE DATA TEST ===' as info;

SELECT
  COUNT(*) as total_reports,
  COUNT(DISTINCT organization_id) as unique_orgs,
  COUNT(DISTINCT requested_by) as unique_requesters
FROM report_queue
WHERE auth.uid() IS NOT NULL  -- This will use RLS
LIMIT 1;