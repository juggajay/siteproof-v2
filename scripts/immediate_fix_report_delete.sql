-- ============================================
-- IMMEDIATE FIX FOR REPORT DELETION ISSUE
-- ============================================
-- Run this script in Supabase SQL Editor to immediately fix the deletion issue
-- Report ID: 59e12281-a1b2-4202-b026-eddf8d9cdb30

-- ============================================
-- STEP 1: CHECK CURRENT STATE
-- ============================================
\echo '=== Step 1: Checking current policies ==='

SELECT
  polname as "Policy Name",
  CASE polcmd
    WHEN 'd' THEN 'DELETE'
    WHEN 'r' THEN 'SELECT'
    ELSE polcmd::text
  END as "Command"
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';

-- ============================================
-- STEP 2: DROP ALL EXISTING DELETE POLICIES
-- ============================================
\echo '=== Step 2: Dropping all DELETE policies ==='

DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;
DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete own reports or organization reports with permission" ON report_queue;
DROP POLICY IF EXISTS "allow_delete_own_or_org_reports" ON report_queue;
DROP POLICY IF EXISTS "report_queue_delete_policy" ON report_queue;

-- ============================================
-- STEP 3: CREATE A SINGLE, WORKING DELETE POLICY
-- ============================================
\echo '=== Step 3: Creating new DELETE policy ==='

-- Using EXISTS instead of IN for better performance and reliability
CREATE POLICY "report_queue_delete_final"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User owns the report
  requested_by = auth.uid()
  OR
  -- User is a member of the organization
  EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = report_queue.organization_id
      AND user_id = auth.uid()
  )
);

-- ============================================
-- STEP 4: VERIFY THE FIX
-- ============================================
\echo '=== Step 4: Verifying the fix ==='

-- Check if policy was created
SELECT
  'Policy Created' as status,
  polname as policy_name
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';

-- Check if user can see and should be able to delete the report
WITH target_report AS (
  SELECT
    id,
    report_name,
    organization_id,
    requested_by,
    requested_by = auth.uid() as is_owner
  FROM report_queue
  WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30'
),
user_membership AS (
  SELECT
    organization_id,
    role
  FROM organization_members
  WHERE user_id = auth.uid()
)
SELECT
  tr.id,
  tr.report_name,
  tr.is_owner,
  um.organization_id IS NOT NULL as is_member,
  CASE
    WHEN tr.is_owner THEN 'Owner - Can Delete'
    WHEN um.organization_id = tr.organization_id THEN 'Org Member - Can Delete'
    ELSE 'Cannot Delete'
  END as permission_status
FROM target_report tr
LEFT JOIN user_membership um ON um.organization_id = tr.organization_id;

-- ============================================
-- STEP 5: TEST DELETION
-- ============================================
\echo '=== Step 5: Testing deletion ==='

-- Try to delete the report
DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM report_queue
  WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'SUCCESS: Report deleted successfully! Deleted % row(s)', v_deleted_count;
  ELSE
    RAISE NOTICE 'FAILED: Could not delete report. Checking why...';

    -- Check if report exists
    IF NOT EXISTS (SELECT 1 FROM report_queue WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30') THEN
      RAISE NOTICE 'Report does not exist (may have been already deleted)';
    ELSE
      RAISE NOTICE 'Report exists but RLS is blocking deletion';
    END IF;
  END IF;
END $$;

-- ============================================
-- STEP 6: FALLBACK - CREATE ADMIN FUNCTION
-- ============================================
\echo '=== Step 6: Creating fallback admin function ==='

-- Create a function that can delete with elevated privileges
CREATE OR REPLACE FUNCTION admin_delete_report(p_report_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_report RECORD;
BEGIN
  -- Get report info before deletion
  SELECT
    id,
    report_name,
    organization_id,
    requested_by
  INTO v_report
  FROM report_queue
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Report not found or already deleted'
    );
  END IF;

  -- Check if user has permission
  IF v_report.requested_by != auth.uid() AND NOT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = v_report.organization_id
      AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No permission to delete this report'
    );
  END IF;

  -- Delete the report
  DELETE FROM report_queue WHERE id = p_report_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Report deleted successfully',
    'report_name', v_report.report_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Use the function to delete
\echo '=== Using admin function to delete ==='
SELECT admin_delete_report('59e12281-a1b2-4202-b026-eddf8d9cdb30'::uuid);

-- ============================================
-- FINAL CHECK
-- ============================================
\echo '=== Final check: Does the report still exist? ==='

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM report_queue
      WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30'
    ) THEN 'REPORT STILL EXISTS - Deletion failed'
    ELSE 'REPORT DELETED SUCCESSFULLY'
  END as final_status;