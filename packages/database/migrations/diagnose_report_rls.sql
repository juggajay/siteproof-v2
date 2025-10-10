-- Diagnostic script to check RLS policies and permissions for report downloads
-- Run this in Supabase SQL Editor to diagnose the 403 error

-- 1. Check current user
SELECT auth.uid() as current_user_id;

-- 2. Check organization membership for the user
SELECT
  om.*,
  o.name as org_name,
  o.deleted_at as org_deleted_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = 'e0d66753-ccce-4920-9b53-56e1112c2f66'; -- Replace with actual user ID

-- 3. Check if the specific report can be accessed
SELECT
  rq.id,
  rq.report_name,
  rq.status,
  rq.organization_id,
  rq.requested_by,
  rq.requested_by = 'e0d66753-ccce-4920-9b53-56e1112c2f66' as is_requester,
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = 'e0d66753-ccce-4920-9b53-56e1112c2f66'
    AND om.organization_id = rq.organization_id
  ) as is_org_member
FROM report_queue rq
WHERE rq.id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e'; -- Replace with actual report ID

-- 4. Check current RLS policies on report_queue
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
WHERE tablename = 'report_queue'
ORDER BY cmd, policyname;

-- 5. Check current RLS policies on organizations
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
WHERE tablename = 'organizations'
ORDER BY cmd, policyname;

-- 6. Test the actual query used in the download route
-- This simulates what the API is trying to do
SELECT
  rq.*,
  o.name as organization_name
FROM report_queue rq
LEFT JOIN organizations o ON o.id = rq.organization_id
WHERE rq.id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e'; -- Replace with actual report ID

-- 7. Check if RLS is enabled on both tables
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('report_queue', 'organizations');

-- 8. Test direct access without JOIN (to isolate the issue)
SELECT * FROM report_queue WHERE id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e';

-- 9. Test organization access separately
SELECT * FROM organizations WHERE id IN (
  SELECT organization_id FROM report_queue WHERE id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e'
);