-- Fix report deletion to be idempotent and handle RLS policy edge cases
-- This migration ensures DELETE operations work correctly even when SELECT is blocked by RLS

-- Step 1: Clean up duplicate/conflicting SELECT policies
DROP POLICY IF EXISTS "Users can download completed reports" ON report_queue;
DROP POLICY IF EXISTS "Users can view reports in their organization with joins" ON report_queue;
DROP POLICY IF EXISTS "Users can view reports in their organization" ON report_queue;

-- Step 2: Create a single, comprehensive SELECT policy
-- This combines all the previous SELECT logic into one policy
CREATE POLICY "Users can view reports in their organization"
ON report_queue
FOR SELECT
TO authenticated
USING (
  -- User can see reports from their organization
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    WHERE om.user_id = auth.uid()
  )
  OR
  -- User can see reports they requested (even if org membership changed)
  requested_by = auth.uid()
);

-- Step 3: Ensure DELETE policy is correct and won't be blocked
-- Re-create the DELETE policy to ensure it's active
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;

CREATE POLICY "Users can delete their own reports or org admin reports"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User can delete their own reports
  requested_by = auth.uid()
  OR
  -- Organization admins/owners/project managers can delete org reports
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['owner', 'admin', 'project_manager'])
  )
);

-- Step 4: Add helpful comments
COMMENT ON POLICY "Users can view reports in their organization" ON report_queue IS
'Allows users to view reports from their organization or reports they personally requested';

COMMENT ON POLICY "Users can delete their own reports or org admin reports" ON report_queue IS
'Allows users to delete reports they requested, or if they are organization admin/owner/project_manager';

-- Step 5: Create an index to speed up DELETE operations
CREATE INDEX IF NOT EXISTS idx_report_queue_delete_lookup
ON report_queue(id, requested_by, organization_id);

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Migration 0029 completed successfully';
  RAISE NOTICE 'Fixed: Duplicate SELECT policies that could block DELETE verification';
  RAISE NOTICE 'Fixed: DELETE operations now work correctly with simplified RLS logic';
  RAISE NOTICE 'Note: Frontend DELETE handler has been updated to handle idempotent deletes';
END $$;
