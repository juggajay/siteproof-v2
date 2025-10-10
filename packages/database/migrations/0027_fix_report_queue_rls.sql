-- Fix RLS policies for report_queue table to allow proper downloads with organization joins
-- This addresses the 403 "Access denied" error when downloading reports

-- First, let's drop the existing SELECT policy to replace it with a better one
DROP POLICY IF EXISTS "Users can view reports in their organization" ON report_queue;

-- Create a new, more explicit SELECT policy for report_queue
CREATE POLICY "Users can view reports in their organization with joins"
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

-- Add a policy specifically for downloading (which performs SELECT)
-- This ensures that if a user can see a report, they can download it
CREATE POLICY "Users can download completed reports"
ON report_queue
FOR SELECT
TO authenticated
USING (
  -- Report must be completed
  status = 'completed'
  AND (
    -- User requested the report
    requested_by = auth.uid()
    OR
    -- User is in the organization
    organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  )
);

-- Also ensure the organizations table allows reading org info for reports
-- Add a more permissive policy for reading organization names in report context
DROP POLICY IF EXISTS "users_view_orgs_for_reports" ON organizations;

CREATE POLICY "users_view_orgs_for_reports"
ON organizations
FOR SELECT
TO authenticated
USING (
  -- Allow viewing organization info if user has any report from that org
  id IN (
    SELECT DISTINCT organization_id
    FROM report_queue
    WHERE requested_by = auth.uid()
    OR organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Ensure DELETE policy exists for cleaning up old reports
DROP POLICY IF EXISTS "Users can delete own reports or organization reports with permission" ON report_queue;

CREATE POLICY "Users can delete reports"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User can delete their own reports
  requested_by = auth.uid()
  OR
  -- Admins and owners can delete any report in their organization
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = report_queue.organization_id
    AND om.role IN ('owner', 'admin', 'project_manager')
  )
);

-- Add an index to improve performance of the requested_by lookups
CREATE INDEX IF NOT EXISTS idx_report_queue_requested_by_status
ON report_queue(requested_by, status);

-- Add a comment explaining the RLS strategy
COMMENT ON TABLE report_queue IS 'Report generation queue with RLS policies that allow users to view/download reports they requested or from their organization';