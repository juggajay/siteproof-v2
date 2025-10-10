-- Diagnostic Script: Report Deletion Issue
-- Run this in Supabase SQL Editor to diagnose why report deletion fails
-- Report ID: 59e12281-a1b2-4202-b026-eddf8d9cdb30

\echo '============================================'
\echo '1. Check Current RLS Policies on report_queue'
\echo '============================================'

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
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd, polname;

\echo ''
\echo '============================================'
\echo '2. Check for Duplicate DELETE Policies'
\echo '============================================'

SELECT
  polname,
  COUNT(*) as count
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd'
GROUP BY polname;

\echo ''
\echo '============================================'
\echo '3. Check the Specific Report Details'
\echo '============================================'

SELECT
  id,
  report_name,
  status,
  requested_by,
  organization_id,
  created_at
FROM report_queue
WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30';

\echo ''
\echo '============================================'
\echo '4. Check Current User Context'
\echo '============================================'
\echo 'Current auth.uid():'
SELECT auth.uid();

\echo ''
\echo '============================================'
\echo '5. Check User Organization Memberships'
\echo '============================================'
\echo 'Organizations the current user belongs to:'

SELECT
  om.organization_id,
  om.role,
  o.name as organization_name
FROM organization_members om
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = auth.uid();

\echo ''
\echo '============================================'
\echo '6. Test if Current User Can See the Report'
\echo '============================================'

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM report_queue
      WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30'
    ) THEN 'YES - User can see the report via SELECT'
    ELSE 'NO - User cannot see the report (RLS blocks SELECT)'
  END as can_see_report;

\echo ''
\echo '============================================'
\echo '7. Test DELETE Policy Logic Manually'
\echo '============================================'
\echo 'Check if current user matches deletion criteria:'

WITH report_info AS (
  SELECT
    requested_by,
    organization_id
  FROM report_queue
  WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30'
),
user_check AS (
  SELECT
    auth.uid() as current_user,
    (SELECT requested_by FROM report_info) as report_owner,
    (SELECT organization_id FROM report_info) as report_org
)
SELECT
  current_user,
  report_owner,
  report_org,
  CASE
    WHEN current_user = report_owner THEN 'YES - User owns the report'
    ELSE 'NO - User does not own the report'
  END as owns_report,
  CASE
    WHEN report_org IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    ) THEN 'YES - User is member of report organization'
    ELSE 'NO - User is not member of report organization'
  END as is_org_member
FROM user_check;

\echo ''
\echo '============================================'
\echo '8. Manual Deletion Test (DRY RUN)'
\echo '============================================'
\echo 'This shows what would happen if we try to delete:'

EXPLAIN (VERBOSE, COSTS OFF)
DELETE FROM report_queue
WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30';

\echo ''
\echo '============================================'
\echo '9. Recommendations'
\echo '============================================'

\echo 'If the diagnosis shows:'
\echo '  - User is NOT in organization_members: Add user to organization'
\echo '  - User IS in org but still fails: Check for conflicting policies'
\echo '  - Multiple DELETE policies exist: Drop duplicates and keep only one'
\echo '  - auth.uid() is NULL: Authentication issue, check Supabase client'
\echo ''
\echo 'To manually fix policies, run this:'
\echo ''
\echo '-- Drop all DELETE policies'
\echo 'DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;'
\echo 'DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;'
\echo 'DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;'
\echo ''
\echo '-- Create the correct policy'
\echo 'CREATE POLICY "report_queue_delete" ON report_queue'
\echo 'FOR DELETE TO authenticated'
\echo 'USING ('
\echo '  requested_by = auth.uid()'
\echo '  OR'
\echo '  organization_id IN ('
\echo '    SELECT organization_id'
\echo '    FROM organization_members'
\echo '    WHERE user_id = auth.uid()'
\echo '  )'
\echo ');'
