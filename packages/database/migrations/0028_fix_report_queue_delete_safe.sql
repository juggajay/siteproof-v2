-- Safe version of the report_queue DELETE policy fix
-- This version avoids potential issues with auth.uid() in function definitions

-- Drop any existing DELETE policies (defensive programming)
DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;

-- Create the DELETE policy using EXISTS pattern (more robust)
CREATE POLICY "Users can delete their own reports or org admin reports"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User can delete their own reports
  requested_by = auth.uid()
  OR
  -- Organization admins/owners/project managers can delete any org report
  -- Using EXISTS with explicit join for better compatibility
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = report_queue.organization_id
      AND om.role = ANY(ARRAY['owner', 'admin', 'project_manager'])
  )
);

-- Add helpful comment
COMMENT ON POLICY "Users can delete their own reports or org admin reports" ON report_queue IS
'Allows users to delete reports they requested, or if they are organization admin/owner/project_manager';

-- Create a simpler diagnostic function that doesn't rely on auth.uid() internally
-- This function takes the user_id as a parameter to avoid auth.uid() issues
CREATE OR REPLACE FUNCTION check_report_delete_permission(
  p_report_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  can_delete BOOLEAN,
  is_owner BOOLEAN,
  is_org_admin BOOLEAN,
  report_exists BOOLEAN,
  user_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH report_info AS (
    SELECT
      rq.id,
      rq.requested_by,
      rq.organization_id,
      (rq.requested_by = p_user_id) AS is_owner,
      TRUE AS exists
    FROM report_queue rq
    WHERE rq.id = p_report_id
  ),
  user_role_info AS (
    SELECT
      om.role,
      om.organization_id
    FROM organization_members om
    WHERE om.user_id = p_user_id
      AND om.organization_id IN (SELECT organization_id FROM report_info)
  )
  SELECT
    COALESCE(ri.is_owner, FALSE) OR COALESCE(uri.role IN ('owner', 'admin', 'project_manager'), FALSE) AS can_delete,
    COALESCE(ri.is_owner, FALSE) AS is_owner,
    COALESCE(uri.role IN ('owner', 'admin', 'project_manager'), FALSE) AS is_org_admin,
    COALESCE(ri.exists, FALSE) AS report_exists,
    uri.role AS user_role
  FROM
    (SELECT 1) AS dummy
    LEFT JOIN report_info ri ON TRUE
    LEFT JOIN user_role_info uri ON TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_report_delete_permission(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION check_report_delete_permission(UUID, UUID) IS
'Debug function to check if a specific user can delete a specific report. Returns detailed permission information.';

-- Create a simple view that doesn't use functions in the SELECT clause
-- This avoids the "function does not exist" error
CREATE OR REPLACE VIEW report_queue_debug AS
SELECT
  rq.id,
  rq.report_name,
  rq.requested_by,
  rq.organization_id,
  rq.status,
  rq.created_at,
  -- Simple boolean checks without function calls
  (rq.requested_by = auth.uid()) AS is_owner,
  -- Check if user has admin role
  EXISTS(
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = rq.organization_id
      AND om.role = ANY(ARRAY['owner', 'admin', 'project_manager'])
  ) AS has_admin_role,
  -- Combine the checks for delete permission
  (
    rq.requested_by = auth.uid()
    OR EXISTS(
      SELECT 1
      FROM organization_members om2
      WHERE om2.user_id = auth.uid()
        AND om2.organization_id = rq.organization_id
        AND om2.role = ANY(ARRAY['owner', 'admin', 'project_manager'])
    )
  ) AS can_delete_calculated
FROM report_queue rq;

-- Grant access to the view
GRANT SELECT ON report_queue_debug TO authenticated;

-- Add comment
COMMENT ON VIEW report_queue_debug IS
'Debug view for report queue permissions - uses inline calculations instead of functions to avoid dependency issues.';

-- Verification query to test the policy is working
-- This should return reports the current user can delete
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully';
  RAISE NOTICE 'To test: SELECT * FROM report_queue_debug WHERE can_delete_calculated = true;';
  RAISE NOTICE 'To debug: SELECT * FROM check_report_delete_permission(''report-id-here'', auth.uid());';
END $$;