-- Part A: DELETE policy only (no functions, no views)
-- This migration creates ONLY the DELETE policy for report_queue

-- Drop any existing DELETE policies (defensive programming)
DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;

-- Create the DELETE policy
-- This allows:
-- 1. Users to delete their own reports (requested_by = auth.uid())
-- 2. Organization admins/owners/project managers to delete any report in their organization
CREATE POLICY "Users can delete their own reports or org admin reports"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User can delete their own reports
  requested_by = auth.uid()
  OR
  -- Organization admins/owners/project managers can delete any org report
  EXISTS (
    SELECT 1
    FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = report_queue.organization_id
      AND role IN ('owner', 'admin', 'project_manager')
  )
);

-- Add helpful comment
COMMENT ON POLICY "Users can delete their own reports or org admin reports" ON report_queue IS
'Allows users to delete reports they requested, or if they are organization admin/owner/project_manager';

-- Test the policy with a simple query (this should work if policy is correct)
-- This is just a comment showing how to test:
-- DELETE FROM report_queue WHERE id = 'some-uuid-here';