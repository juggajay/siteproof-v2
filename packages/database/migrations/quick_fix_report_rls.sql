-- QUICK FIX: Temporary solution to allow report downloads
-- Run this immediately in Supabase SQL Editor to fix the 403 error

-- Option 1: Make the SELECT policy more permissive temporarily
DROP POLICY IF EXISTS "Users can view reports in their organization" ON report_queue;

CREATE POLICY "Users can view reports in their organization - permissive"
ON report_queue
FOR SELECT
TO authenticated
USING (
  -- Allow access if user requested the report OR is in the organization
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Option 2: Add a bypass policy for completed reports
CREATE POLICY IF NOT EXISTS "bypass_for_completed_reports"
ON report_queue
FOR SELECT
TO authenticated
USING (
  status = 'completed'
  AND (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM organization_members
      WHERE user_id = auth.uid()
      AND organization_id = report_queue.organization_id
    )
  )
);

-- Option 3: Temporarily allow organization viewing for report context
DROP POLICY IF EXISTS "users_view_own_orgs" ON organizations;

CREATE POLICY "users_view_own_orgs_permissive"
ON organizations
FOR SELECT
TO authenticated
USING (
  -- Original condition
  (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  )
  OR
  -- Additional condition for report access
  EXISTS (
    SELECT 1 FROM report_queue rq
    WHERE rq.organization_id = organizations.id
    AND (
      rq.requested_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om2
        WHERE om2.user_id = auth.uid()
        AND om2.organization_id = rq.organization_id
      )
    )
  )
);

-- Verify the fix
SELECT 'Policies updated. Test the download again.' as message;