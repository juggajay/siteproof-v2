-- Fix RLS policies for report_queue table to allow proper deletion
-- Run this in Supabase SQL Editor

-- First, check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'report_queue';

-- Drop existing delete policy if it exists (it might be too restrictive)
DROP POLICY IF EXISTS "Users can delete own reports" ON report_queue;
DROP POLICY IF EXISTS "Members can delete organization reports" ON report_queue;

-- Create new comprehensive delete policy
CREATE POLICY "Users can delete own reports or organization reports with permission"
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

-- Also ensure select and update policies are correct
-- Check if users can see reports
DROP POLICY IF EXISTS "Users can view organization reports" ON report_queue;

CREATE POLICY "Users can view organization reports"
ON report_queue
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = report_queue.organization_id
  )
);

-- Allow users to update their own reports or organization reports with permission
DROP POLICY IF EXISTS "Users can update organization reports" ON report_queue;

CREATE POLICY "Users can update organization reports with permission"
ON report_queue
FOR UPDATE
TO authenticated
USING (
  requested_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = report_queue.organization_id
    AND om.role IN ('owner', 'admin', 'project_manager')
  )
)
WITH CHECK (
  requested_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = report_queue.organization_id
    AND om.role IN ('owner', 'admin', 'project_manager')
  )
);

-- Verify the policies were created
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'report_queue'
ORDER BY cmd;

-- Test the delete permission (replace with actual IDs from your database)
-- This should return true if the current user can delete the report
/*
SELECT 
  id,
  report_name,
  requested_by,
  organization_id,
  auth.uid() as current_user,
  CASE 
    WHEN requested_by = auth.uid() THEN 'Own report'
    WHEN EXISTS (
      SELECT 1 
      FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = report_queue.organization_id
      AND om.role IN ('owner', 'admin', 'project_manager')
    ) THEN 'Has permission'
    ELSE 'No permission'
  END as delete_permission
FROM report_queue
LIMIT 5;
*/