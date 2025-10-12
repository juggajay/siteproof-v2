-- ============================================
-- COMPLETE FIX: Report Queue Delete Permissions
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- STEP 1: Drop ALL existing DELETE policies
DO $$
DECLARE
  policy_rec RECORD;
BEGIN
  FOR policy_rec IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON report_queue', policy_rec.polname);
    RAISE NOTICE 'Dropped DELETE policy: %', policy_rec.polname;
  END LOOP;
END $$;

-- STEP 2: Create ONE correct DELETE policy
CREATE POLICY "report_queue_delete_allow_org_members"
ON report_queue
FOR DELETE
TO authenticated
USING (
  requested_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = report_queue.organization_id
      AND om.user_id = auth.uid()
  )
);

-- STEP 3: Verify only one DELETE policy exists
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';

  IF policy_count = 0 THEN
    RAISE EXCEPTION 'No DELETE policy was created!';
  ELSIF policy_count > 1 THEN
    RAISE WARNING 'Multiple DELETE policies exist (%). This may cause issues.', policy_count;
  ELSE
    RAISE NOTICE 'SUCCESS: Exactly one DELETE policy exists.';
  END IF;
END $$;

-- STEP 4: Create debug helper function
CREATE OR REPLACE FUNCTION debug_report_delete_permission(p_report_id UUID)
RETURNS TABLE (
  check_name TEXT,
  check_value TEXT,
  check_result BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_report RECORD;
BEGIN
  v_user_id := auth.uid();

  SELECT * INTO v_report
  FROM report_queue
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'Report exists'::TEXT, 'Report not found'::TEXT, FALSE;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'Report exists'::TEXT, v_report.report_name::TEXT, TRUE;
  RETURN QUERY SELECT 'Report ID'::TEXT, v_report.id::TEXT, TRUE;
  RETURN QUERY SELECT 'Organization ID'::TEXT, v_report.organization_id::TEXT, TRUE;
  RETURN QUERY SELECT 'Requested by'::TEXT, v_report.requested_by::TEXT, TRUE;
  RETURN QUERY SELECT 'Current user ID'::TEXT, v_user_id::TEXT, TRUE;

  RETURN QUERY SELECT
    'User owns report'::TEXT,
    CASE WHEN v_report.requested_by = v_user_id THEN 'YES' ELSE 'NO' END::TEXT,
    v_report.requested_by = v_user_id;

  RETURN QUERY SELECT
    'User in organization'::TEXT,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = v_report.organization_id AND user_id = v_user_id
      ) THEN 'YES' ELSE 'NO'
    END::TEXT,
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = v_report.organization_id AND user_id = v_user_id
    );

  RETURN QUERY SELECT
    'CAN DELETE?'::TEXT,
    CASE
      WHEN v_report.requested_by = v_user_id THEN 'YES - Owner'
      WHEN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = v_report.organization_id AND user_id = v_user_id
      ) THEN 'YES - Org member'
      ELSE 'NO - Not authorized'
    END::TEXT,
    (
      v_report.requested_by = v_user_id
      OR
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = v_report.organization_id AND user_id = v_user_id
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Show current DELETE policy
SELECT
  '=== Current DELETE Policy ===' as status,
  polname as policy_name,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';

-- STEP 6: Test the specific report
SELECT * FROM debug_report_delete_permission('59e12281-a1b2-4202-b026-eddf8d9cdb30'::uuid);
