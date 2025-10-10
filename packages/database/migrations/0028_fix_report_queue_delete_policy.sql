-- Fix the DELETE policy for report_queue to ensure it works correctly
-- This addresses the issue where delete operations appear to succeed but don't actually delete

-- Drop the existing DELETE policy
DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;

-- Create a more robust DELETE policy with better debugging
CREATE POLICY "Users can delete their own reports or org admin reports"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User can delete their own reports (most common case)
  requested_by = auth.uid()
  OR
  -- Organization admins/owners/project managers can delete reports
  (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'project_manager')
    )
  )
);

-- Add a helper function to check if user can delete a report (for debugging)
CREATE OR REPLACE FUNCTION can_delete_report(
  p_report_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
  v_report RECORD;
  v_member RECORD;
BEGIN
  -- Get report details
  SELECT requested_by, organization_id
  INTO v_report
  FROM report_queue
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if user requested the report
  IF v_report.requested_by = p_user_id THEN
    RETURN TRUE;
  END IF;

  -- Check if user is an admin/owner/pm in the organization
  SELECT role
  INTO v_member
  FROM organization_members
  WHERE user_id = p_user_id
    AND organization_id = v_report.organization_id
    AND role IN ('owner', 'admin', 'project_manager');

  IF FOUND THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_delete_report(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_report(UUID) TO authenticated;

-- Add a comment
COMMENT ON POLICY "Users can delete their own reports or org admin reports" ON report_queue IS
'Allows users to delete reports they requested, or if they are org admin/owner/project_manager';

COMMENT ON FUNCTION can_delete_report(UUID, UUID) IS
'Helper function to check if a user has permission to delete a report. Returns TRUE if user can delete, FALSE otherwise.';
