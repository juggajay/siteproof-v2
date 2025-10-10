-- Fix the DELETE policy for report_queue to ensure it works correctly
-- This addresses the issue where delete operations appear to succeed but don't actually delete

-- Drop the existing DELETE policy if it exists (defensive programming)
DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;

-- Create a robust DELETE policy
-- This policy allows two scenarios:
-- 1. Users can delete their own reports (requested_by = auth.uid())
-- 2. Organization admins/owners/project managers can delete any report in their organization
CREATE POLICY "Users can delete their own reports or org admin reports"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User can delete their own reports
  requested_by = auth.uid()
  OR
  -- Organization admins/owners/project managers can delete any org report
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'project_manager')
  )
);

-- Create helper function for debugging DELETE permissions
-- This function helps diagnose why a delete might fail
CREATE OR REPLACE FUNCTION can_delete_report(p_report_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_report RECORD;
  v_user_id UUID;
  v_is_owner BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get report details
  SELECT
    requested_by,
    organization_id
  INTO v_report
  FROM report_queue
  WHERE id = p_report_id;

  -- If report doesn't exist, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if user requested the report
  IF v_report.requested_by = v_user_id THEN
    RETURN TRUE;
  END IF;

  -- Check if user is an admin/owner/project_manager in the organization
  PERFORM 1
  FROM organization_members
  WHERE user_id = v_user_id
    AND organization_id = v_report.organization_id
    AND role IN ('owner', 'admin', 'project_manager');

  IF FOUND THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create overloaded version with explicit user_id parameter for testing
CREATE OR REPLACE FUNCTION can_delete_report(p_report_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_report RECORD;
BEGIN
  -- Validate inputs
  IF p_report_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get report details
  SELECT
    requested_by,
    organization_id
  INTO v_report
  FROM report_queue
  WHERE id = p_report_id;

  -- If report doesn't exist, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if user requested the report
  IF v_report.requested_by = p_user_id THEN
    RETURN TRUE;
  END IF;

  -- Check if user is an admin/owner/project_manager in the organization
  PERFORM 1
  FROM organization_members
  WHERE user_id = p_user_id
    AND organization_id = v_report.organization_id
    AND role IN ('owner', 'admin', 'project_manager');

  IF FOUND THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION can_delete_report(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_report(UUID, UUID) TO authenticated;

-- Add helpful comments
COMMENT ON POLICY "Users can delete their own reports or org admin reports" ON report_queue IS
'Allows users to delete reports they requested, or if they are organization admin/owner/project_manager';

COMMENT ON FUNCTION can_delete_report(UUID) IS
'Helper function to check if the current user has permission to delete a report. Returns TRUE if user can delete, FALSE otherwise.';

COMMENT ON FUNCTION can_delete_report(UUID, UUID) IS
'Helper function to check if a specific user has permission to delete a report. For testing and debugging purposes.';

-- Create a diagnostic view to help debug permission issues (optional but useful)
CREATE OR REPLACE VIEW report_queue_permissions AS
SELECT
  rq.id,
  rq.report_name,
  rq.requested_by,
  rq.organization_id,
  rq.status,
  rq.created_at,
  (rq.requested_by = auth.uid()) AS is_owner,
  EXISTS(
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = rq.organization_id
      AND om.role IN ('owner', 'admin', 'project_manager')
  ) AS is_org_admin,
  can_delete_report(rq.id) AS can_delete
FROM report_queue rq;

-- Grant access to the view
GRANT SELECT ON report_queue_permissions TO authenticated;

COMMENT ON VIEW report_queue_permissions IS
'Diagnostic view to check report permissions for the current user. Shows which reports can be deleted.';