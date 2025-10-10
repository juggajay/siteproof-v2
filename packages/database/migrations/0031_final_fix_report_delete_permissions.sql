-- ============================================
-- Migration 0031: FINAL FIX for Report Queue Delete Permissions
-- ============================================
-- Issue: Multiple conflicting migrations (0029 vs 0030) causing deletion to fail
-- Migration 0029: Restricts DELETE to admin/owner/project_manager only
-- Migration 0030: Allows ALL organization members to delete
-- Problem: 0029 might have been applied after 0030, causing restrictive policy
-- Solution: Force correct policy and ensure it's the ONLY delete policy

-- ============================================
-- STEP 1: DROP ALL EXISTING DELETE POLICIES
-- ============================================
-- Remove ANY and ALL delete policies that might exist
DO $$
DECLARE
  policy_rec RECORD;
BEGIN
  -- Find and drop all DELETE policies on report_queue
  FOR policy_rec IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'report_queue'::regclass
      AND polcmd = 'd'  -- 'd' is DELETE command
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON report_queue', policy_rec.polname);
    RAISE NOTICE 'Dropped DELETE policy: %', policy_rec.polname;
  END LOOP;
END $$;

-- ============================================
-- STEP 2: CREATE THE CORRECT DELETE POLICY
-- ============================================
-- This matches migration 0030's intent: ALL organization members can delete
-- Not just admins - this aligns with SELECT policy for consistency

CREATE POLICY "report_queue_delete_allow_org_members"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User can delete reports they requested
  requested_by = auth.uid()
  OR
  -- ANY member of the organization can delete reports
  -- (not just admin/owner/project_manager)
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = report_queue.organization_id
      AND om.user_id = auth.uid()
    -- NOTE: No role restriction here - any member can delete
  )
);

-- ============================================
-- STEP 3: VERIFY ONLY ONE DELETE POLICY EXISTS
-- ============================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass
    AND polcmd = 'd';

  IF policy_count = 0 THEN
    RAISE EXCEPTION 'No DELETE policy was created!';
  ELSIF policy_count > 1 THEN
    RAISE WARNING 'Multiple DELETE policies exist (%). This may cause issues.', policy_count;
  ELSE
    RAISE NOTICE 'SUCCESS: Exactly one DELETE policy exists.';
  END IF;
END $$;

-- ============================================
-- STEP 4: DOCUMENT THE POLICY
-- ============================================
COMMENT ON POLICY "report_queue_delete_allow_org_members" ON report_queue IS
'Allows deletion by report owner OR any organization member. This aligns with SELECT policy for consistency. Migration 0031 ensures this is the ONLY delete policy.';

-- ============================================
-- STEP 5: CREATE HELPER FUNCTION FOR DEBUGGING
-- ============================================
CREATE OR REPLACE FUNCTION debug_report_delete_permission(p_report_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  check_name TEXT,
  check_value TEXT,
  check_result BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_report RECORD;
BEGIN
  -- Use provided user_id or current user
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Get report details
  SELECT * INTO v_report
  FROM report_queue
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'Report exists'::TEXT, 'Report not found'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Check various conditions
  RETURN QUERY SELECT 'Report exists'::TEXT, v_report.report_name::TEXT, TRUE;
  RETURN QUERY SELECT 'Report ID'::TEXT, v_report.id::TEXT, TRUE;
  RETURN QUERY SELECT 'Organization ID'::TEXT, v_report.organization_id::TEXT, TRUE;
  RETURN QUERY SELECT 'Requested by'::TEXT, v_report.requested_by::TEXT, TRUE;
  RETURN QUERY SELECT 'Current user ID'::TEXT, v_user_id::TEXT, TRUE;

  -- Check if user owns the report
  RETURN QUERY SELECT
    'User owns report'::TEXT,
    CASE
      WHEN v_report.requested_by = v_user_id THEN 'YES - Can delete'
      ELSE 'NO'
    END::TEXT,
    v_report.requested_by = v_user_id;

  -- Check if user is in organization
  RETURN QUERY SELECT
    'User in organization'::TEXT,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = v_report.organization_id
          AND user_id = v_user_id
      ) THEN 'YES - Can delete'
      ELSE 'NO'
    END::TEXT,
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = v_report.organization_id
        AND user_id = v_user_id
    );

  -- Check user's role in organization
  RETURN QUERY SELECT
    'User role in org'::TEXT,
    COALESCE(
      (SELECT role::TEXT FROM organization_members
       WHERE organization_id = v_report.organization_id
         AND user_id = v_user_id),
      'Not a member'
    )::TEXT,
    TRUE;

  -- Final verdict
  RETURN QUERY SELECT
    'CAN DELETE?'::TEXT,
    CASE
      WHEN v_report.requested_by = v_user_id THEN 'YES - Owner'
      WHEN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = v_report.organization_id
          AND user_id = v_user_id
      ) THEN 'YES - Org member'
      ELSE 'NO - Not authorized'
    END::TEXT,
    (
      v_report.requested_by = v_user_id
      OR
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = v_report.organization_id
          AND user_id = v_user_id
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: CREATE FORCE DELETE FUNCTION (EMERGENCY USE)
-- ============================================
CREATE OR REPLACE FUNCTION force_delete_report(p_report_id UUID)
RETURNS JSON AS $$
DECLARE
  v_report RECORD;
  v_can_delete BOOLEAN;
  v_debug_info JSONB;
BEGIN
  -- Get report info
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

  -- Check permission
  v_can_delete := (
    v_report.requested_by = auth.uid()
    OR
    EXISTS (
      SELECT 1
      FROM organization_members
      WHERE organization_id = v_report.organization_id
        AND user_id = auth.uid()
    )
  );

  IF NOT v_can_delete THEN
    -- Collect debug info
    v_debug_info := json_build_object(
      'report_id', v_report.id,
      'report_org', v_report.organization_id,
      'report_owner', v_report.requested_by,
      'current_user', auth.uid(),
      'user_in_org', EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = v_report.organization_id
          AND user_id = auth.uid()
      ),
      'user_owns_report', v_report.requested_by = auth.uid()
    );

    RETURN json_build_object(
      'success', false,
      'error', 'Not authorized to delete this report',
      'debug', v_debug_info
    );
  END IF;

  -- Force delete (bypasses RLS as SECURITY DEFINER)
  DELETE FROM report_queue WHERE id = p_report_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Report deleted successfully',
    'report_id', p_report_id,
    'report_name', v_report.report_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show current DELETE policy
SELECT
  '=== Current DELETE Policy ===' as info,
  polname as policy_name,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';

-- Test specific report (replace with actual ID)
-- SELECT * FROM debug_report_delete_permission('59e12281-a1b2-4202-b026-eddf8d9cdb30'::uuid);

-- Force delete if needed (replace with actual ID)
-- SELECT force_delete_report('59e12281-a1b2-4202-b026-eddf8d9cdb30'::uuid);

-- ============================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================
/*
To rollback this migration and restore the admin-only delete policy:

DROP POLICY IF EXISTS "report_queue_delete_allow_org_members" ON report_queue;
DROP FUNCTION IF EXISTS debug_report_delete_permission(UUID, UUID);
DROP FUNCTION IF EXISTS force_delete_report(UUID);

CREATE POLICY "report_queue_delete"
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
      AND role = ANY(ARRAY['owner', 'admin', 'project_manager'])
  )
);
*/