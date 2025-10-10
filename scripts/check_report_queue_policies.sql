-- Check current RLS policies on report_queue table
-- This script helps diagnose the RLS policy issue causing DELETE 404 errors

-- 1. Show all current policies on report_queue
SELECT
  polname as policy_name,
  polcmd as command,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command_type,
  polroles::regrole[] as roles,
  pg_get_expr(polqual, polrelid) as using_clause,
  pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd, polname;

-- 2. Test what a user can see vs delete
-- Replace with actual user_id and report_id for testing
DO $$
DECLARE
  test_user_id UUID := NULL; -- Set to actual user_id
  test_report_id UUID := NULL; -- Set to actual report_id
BEGIN
  IF test_user_id IS NOT NULL AND test_report_id IS NOT NULL THEN
    -- Test SELECT visibility
    RAISE NOTICE 'Testing SELECT visibility for user % on report %', test_user_id, test_report_id;

    -- Test DELETE capability (without actually deleting)
    RAISE NOTICE 'Testing DELETE capability for user % on report %', test_user_id, test_report_id;
  ELSE
    RAISE NOTICE 'Set test_user_id and test_report_id to run visibility tests';
  END IF;
END $$;

-- 3. Check for policy conflicts or overlaps
WITH policy_analysis AS (
  SELECT
    polname,
    polcmd,
    pg_get_expr(polqual, polrelid) as using_clause,
    CASE
      WHEN pg_get_expr(polqual, polrelid) LIKE '%auth.uid()%' THEN 'Uses auth.uid()'
      ELSE 'Does not use auth.uid()'
    END as auth_check,
    CASE
      WHEN pg_get_expr(polqual, polrelid) LIKE '%organization_members%' THEN 'Checks org membership'
      ELSE 'No org check'
    END as org_check
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass
)
SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'd' THEN 'DELETE'
    ELSE polcmd::text
  END as command,
  auth_check,
  org_check,
  LENGTH(using_clause) as policy_complexity
FROM policy_analysis
ORDER BY polcmd, polname;

-- 4. Analyze the difference between SELECT and DELETE policies
WITH select_policies AS (
  SELECT
    polname,
    pg_get_expr(polqual, polrelid) as using_clause
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'r'
),
delete_policies AS (
  SELECT
    polname,
    pg_get_expr(polqual, polrelid) as using_clause
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd'
)
SELECT
  'SELECT' as policy_type,
  COUNT(*) as count,
  STRING_AGG(polname, ', ') as policy_names
FROM select_policies
UNION ALL
SELECT
  'DELETE' as policy_type,
  COUNT(*) as count,
  STRING_AGG(polname, ', ') as policy_names
FROM delete_policies;

-- 5. Check if there are any duplicate or conflicting policy names
SELECT
  polname,
  COUNT(*) as duplicate_count
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
GROUP BY polname
HAVING COUNT(*) > 1;

-- 6. Detailed policy examination focusing on the mismatch
SELECT
  'The issue is likely that:' as diagnosis,
  E'1. SELECT policies allow viewing reports based on organization membership\n' ||
  E'2. DELETE policy might have different conditions\n' ||
  E'3. The API does SELECT first to check, which may use different criteria than DELETE\n' ||
  E'4. This causes the 404 error when SELECT fails even though DELETE might work' as explanation;