-- Minimal migration to add DELETE policy for report_queue
-- This is the absolute minimum required to enable DELETE operations

-- Drop any existing DELETE policies to start fresh
DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;

-- Create a simple DELETE policy that just checks ownership and org membership
-- No functions, no views, just a straightforward policy
CREATE POLICY "Users can delete their own reports or org admin reports"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- Simple ownership check
  requested_by = auth.uid()
  OR
  -- Simple admin check using subquery
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['owner', 'admin', 'project_manager'])
  )
);

-- That's it! No functions, no views, just the policy.