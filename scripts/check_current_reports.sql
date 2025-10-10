-- Check current reports in the system
-- Run this in Supabase SQL Editor to see what reports exist

-- Show current user
SELECT 'Current User ID:' as info, auth.uid() as value;

-- Show all reports visible to current user (with RLS)
SELECT
  'Reports visible to you:' as info,
  id,
  report_name,
  status,
  requested_by,
  organization_id,
  created_at
FROM report_queue
ORDER BY created_at DESC
LIMIT 10;

-- Count total reports
SELECT
  'Total reports you can see:' as info,
  COUNT(*)::TEXT as count
FROM report_queue;

-- Check if the specific report exists (bypass RLS as superuser)
-- Note: This will only work if you're logged in as a superuser
SELECT
  'Does report 59e12281-a1b2-4202-b026-eddf8d9cdb30 exist in database?' as info,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM report_queue
      WHERE id = '59e12281-a1b2-4202-b026-eddf8d9cdb30'
    ) THEN 'YES - Report exists but you might not be able to see it'
    ELSE 'NO - Report has been deleted from the database'
  END as result;

-- Show your organization memberships
SELECT
  'Your organizations:' as info,
  om.organization_id,
  om.role,
  o.name as org_name
FROM organization_members om
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = auth.uid();
