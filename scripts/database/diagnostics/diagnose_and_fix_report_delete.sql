-- ============================================
-- COMPREHENSIVE REPORT DELETION DIAGNOSTIC SCRIPT
-- ============================================
-- Run this script in Supabase SQL Editor to diagnose and fix deletion issues
-- Replace the placeholders with actual values:
-- {REPORT_ID} = '59e12281-a1b2-4202-b026-eddf8d9cdb30'
-- {USER_ID} = The actual user's auth.uid() trying to delete

-- ============================================
-- STEP 1: CHECK CURRENT RLS POLICIES
-- ============================================
SELECT
  'STEP 1: Current RLS Policies on report_queue' as step_info;

SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command,
  pg_get_expr(polqual, polrelid) as using_clause,
  pg_get_expr(polwithcheck, polrelid) as with_check_clause,
  polpermissive as is_permissive
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd, polname;

-- ============================================
-- STEP 2: CHECK FOR DUPLICATE DELETE POLICIES
-- ============================================
SELECT
  'STEP 2: Checking for duplicate DELETE policies' as step_info;

SELECT
  COUNT(*) as delete_policy_count,
  array_agg(polname) as policy_names
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';

-- ============================================
-- STEP 3: GET REPORT DETAILS
-- ============================================
SELECT
  'STEP 3: Report Details' as step_info;

-- Replace {REPORT_ID} with actual report ID
SELECT
  id,
  organization_id,
  requested_by,
  status,
  report_name,
  created_at,
  requested_by = auth.uid() as is_owner,
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = rq.organization_id
      AND om.user_id = auth.uid()
  ) as user_in_org
FROM report_queue rq
WHERE id = '{REPORT_ID}';

-- ============================================
-- STEP 4: CHECK USER'S ORGANIZATION MEMBERSHIP
-- ============================================
SELECT
  'STEP 4: User Organization Membership' as step_info;

-- Check current user's organizations
SELECT
  om.organization_id,
  om.user_id,
  om.role,
  o.name as org_name,
  om.user_id = auth.uid() as is_current_user
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = auth.uid();

-- ============================================
-- STEP 5: TEST DELETE PERMISSION EXPLICITLY
-- ============================================
SELECT
  'STEP 5: Testing Delete Permission' as step_info;

-- Test if current user can delete the specific report
-- Replace {REPORT_ID} with actual report ID
SELECT
  rq.id,
  rq.report_name,
  rq.requested_by = auth.uid() as owns_report,
  EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = rq.organization_id
      AND user_id = auth.uid()
  ) as in_organization,
  -- Manually check the policy logic
  (
    rq.requested_by = auth.uid()
    OR
    rq.organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  ) as should_be_able_to_delete
FROM report_queue rq
WHERE id = '{REPORT_ID}';

-- ============================================
-- STEP 6: CHECK AUTH CONTEXT
-- ============================================
SELECT
  'STEP 6: Auth Context Check' as step_info;

-- Check current auth context
SELECT
  auth.uid() as current_auth_uid,
  auth.role() as current_role,
  current_user as db_user,
  current_setting('request.jwt.claims', true)::json->>'sub' as jwt_sub;

-- ============================================
-- STEP 7: MANUALLY TEST POLICY LOGIC
-- ============================================
SELECT
  'STEP 7: Manual Policy Logic Test' as step_info;

-- Replace {REPORT_ID} with actual report ID
WITH report_data AS (
  SELECT
    id,
    organization_id,
    requested_by,
    report_name
  FROM report_queue
  WHERE id = '{REPORT_ID}'
),
user_orgs AS (
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
)
SELECT
  rd.*,
  rd.requested_by = auth.uid() as condition_1_owns_report,
  rd.organization_id IN (SELECT organization_id FROM user_orgs) as condition_2_in_org,
  (
    rd.requested_by = auth.uid()
    OR
    rd.organization_id IN (SELECT organization_id FROM user_orgs)
  ) as can_delete_per_policy
FROM report_data rd;

-- ============================================
-- FIX 1: DROP ALL DELETE POLICIES AND RECREATE
-- ============================================
SELECT
  'FIX 1: Dropping and recreating DELETE policy' as fix_info;

-- Drop all existing DELETE policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'report_queue'::regclass
      AND polcmd = 'd'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON report_queue', policy_record.polname);
    RAISE NOTICE 'Dropped policy: %', policy_record.polname;
  END LOOP;
END $$;

-- Create a single, clear DELETE policy
CREATE POLICY "allow_delete_own_or_org_reports"
ON report_queue
FOR DELETE
TO authenticated
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- FIX 2: VERIFY THE NEW POLICY
-- ============================================
SELECT
  'FIX 2: Verifying new DELETE policy' as fix_info;

SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'd' THEN 'DELETE'
  END as command,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';

-- ============================================
-- FIX 3: TEST DELETION WITH FIXED POLICY
-- ============================================
SELECT
  'FIX 3: Testing deletion with new policy' as fix_info;

-- Test if deletion would work now
-- Replace {REPORT_ID} with actual report ID
SELECT
  id,
  report_name,
  requested_by = auth.uid() as owns_report,
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  ) as in_org,
  'Should be able to delete now' as status
FROM report_queue
WHERE id = '{REPORT_ID}';

-- ============================================
-- FIX 4: ALTERNATIVE - BYPASS RLS FOR TESTING
-- ============================================
-- WARNING: Only use this for testing/debugging
-- This allows you to delete the report regardless of RLS

-- First, check if the report exists
-- SELECT * FROM report_queue WHERE id = '{REPORT_ID}';

-- If needed, temporarily disable RLS (requires superuser)
-- ALTER TABLE report_queue DISABLE ROW LEVEL SECURITY;
-- DELETE FROM report_queue WHERE id = '{REPORT_ID}';
-- ALTER TABLE report_queue ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FIX 5: CREATE A DELETION FUNCTION WITH ELEVATED PRIVILEGES
-- ============================================
CREATE OR REPLACE FUNCTION delete_report_with_check(p_report_id UUID)
RETURNS JSON AS $$
DECLARE
  v_deleted_count INTEGER;
  v_can_delete BOOLEAN;
  v_report RECORD;
  v_user_orgs UUID[];
BEGIN
  -- Get report details
  SELECT * INTO v_report
  FROM report_queue
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Report not found',
      'report_id', p_report_id
    );
  END IF;

  -- Get user's organizations
  SELECT array_agg(organization_id) INTO v_user_orgs
  FROM organization_members
  WHERE user_id = auth.uid();

  -- Check if user can delete
  v_can_delete := (
    v_report.requested_by = auth.uid()
    OR
    v_report.organization_id = ANY(v_user_orgs)
  );

  IF NOT v_can_delete THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized to delete this report',
      'report_id', p_report_id,
      'requested_by', v_report.requested_by,
      'report_org_id', v_report.organization_id,
      'user_id', auth.uid(),
      'user_orgs', v_user_orgs
    );
  END IF;

  -- Delete the report
  DELETE FROM report_queue WHERE id = p_report_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN json_build_object(
    'success', v_deleted_count > 0,
    'deleted_count', v_deleted_count,
    'report_id', p_report_id,
    'report_name', v_report.report_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
-- SELECT delete_report_with_check('{REPORT_ID}'::uuid);

-- ============================================
-- DIAGNOSTIC SUMMARY
-- ============================================
SELECT
  'DIAGNOSTIC SUMMARY' as summary;

-- Replace {REPORT_ID} with actual report ID
WITH report_check AS (
  SELECT
    rq.id,
    rq.organization_id,
    rq.requested_by,
    rq.report_name,
    rq.requested_by = auth.uid() as owns_report,
    EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = rq.organization_id
        AND om.user_id = auth.uid()
    ) as in_org
  FROM report_queue rq
  WHERE id = '{REPORT_ID}'
),
policy_check AS (
  SELECT
    COUNT(*) FILTER (WHERE polcmd = 'd') as delete_policies,
    COUNT(*) FILTER (WHERE polcmd = 'r') as select_policies
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass
)
SELECT
  rc.*,
  pc.delete_policies,
  pc.select_policies,
  CASE
    WHEN rc.owns_report OR rc.in_org THEN 'User SHOULD be able to delete'
    ELSE 'User CANNOT delete (not owner and not in org)'
  END as expected_result,
  CASE
    WHEN pc.delete_policies = 0 THEN 'ERROR: No DELETE policy exists!'
    WHEN pc.delete_policies > 1 THEN 'WARNING: Multiple DELETE policies may conflict'
    ELSE 'DELETE policy exists'
  END as policy_status
FROM report_check rc, policy_check pc;

-- ============================================
-- QUICK FIX COMMANDS
-- ============================================
/*
To quickly fix the issue, run these commands in order:

1. First, check what policies exist:
   SELECT polname FROM pg_policy WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';

2. Drop all DELETE policies:
   DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;
   DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;
   DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;
   DROP POLICY IF EXISTS "Users can delete own reports or organization reports with permission" ON report_queue;
   DROP POLICY IF EXISTS "allow_delete_own_or_org_reports" ON report_queue;

3. Create a single clean policy:
   CREATE POLICY "report_queue_delete_policy"
   ON report_queue
   FOR DELETE
   TO authenticated
   USING (
     requested_by = auth.uid()
     OR
     EXISTS (
       SELECT 1
       FROM organization_members
       WHERE organization_id = report_queue.organization_id
         AND user_id = auth.uid()
     )
   );

4. Test deletion:
   DELETE FROM report_queue WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30';

5. If still failing, use the function:
   SELECT delete_report_with_check('59e12281-a1b2-4202-b026-eddf8d9cdb30'::uuid);
*/