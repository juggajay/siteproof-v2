-- Part C: Diagnostic view only (requires functions from part B)
-- This migration creates ONLY the diagnostic view

-- Drop view if it exists
DROP VIEW IF EXISTS report_queue_permissions;

-- Create a diagnostic view to help debug permission issues
-- This view requires the can_delete_report function to exist
CREATE OR REPLACE VIEW report_queue_permissions AS
SELECT
  rq.id,
  rq.report_name,
  rq.requested_by,
  rq.organization_id,
  rq.status,
  rq.created_at,
  -- Check if current user is the owner
  (rq.requested_by = auth.uid()) AS is_owner,
  -- Check if current user is an org admin
  EXISTS(
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = rq.organization_id
      AND om.role IN ('owner', 'admin', 'project_manager')
  ) AS is_org_admin,
  -- Check if user can delete (uses the function)
  -- Wrap in COALESCE to handle potential NULL
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_delete_report')
    THEN can_delete_report(rq.id)
    ELSE FALSE
  END AS can_delete
FROM report_queue rq;

-- Grant access to the view
GRANT SELECT ON report_queue_permissions TO authenticated;

-- Add comment
COMMENT ON VIEW report_queue_permissions IS
'Diagnostic view to check report permissions for the current user. Shows which reports can be deleted.';

-- Test query (as comment):
-- SELECT * FROM report_queue_permissions WHERE requested_by = auth.uid();