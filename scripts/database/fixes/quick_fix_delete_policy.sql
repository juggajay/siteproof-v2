-- ============================================
-- QUICK FIX: Add DELETE Policy to report_queue
-- ============================================
-- Problem: DELETE operations return deletedCount: 0
-- Cause: Missing or incorrect DELETE RLS policy
-- Solution: Create proper DELETE policy
-- ============================================

-- Step 1: Clean up any existing DELETE policies
-- (Safe to run even if policies don't exist)
DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete their own reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete own reports or organization reports with permission" ON report_queue;
DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;

-- Step 2: Create the correct DELETE policy
-- This allows:
--   1. Users to delete their own reports (requested_by = auth.uid())
--   2. Org admins/owners/project managers to delete any org report
CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User owns the report
  requested_by = auth.uid()
  OR
  -- User is admin/owner/project_manager in the organization
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['owner', 'admin', 'project_manager'])
  )
);

-- Step 3: Verify the policy was created
SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'd' THEN 'DELETE'
    ELSE polcmd::text
  END as command_type,
  pg_get_expr(polqual, polrelid) as policy_logic
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';

-- Expected output: One row showing "report_queue_delete" policy

-- ============================================
-- Verification Steps
-- ============================================

-- 1. Check if you can now see reports
-- SELECT id, report_name, requested_by FROM report_queue LIMIT 5;

-- 2. Test DELETE permission check (replace USER_ID and REPORT_ID)
/*
SELECT
  rq.id,
  rq.report_name,
  rq.requested_by,
  auth.uid() as current_user,
  (rq.requested_by = auth.uid()) as can_delete_as_owner,
  EXISTS(
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = rq.organization_id
      AND om.role IN ('owner', 'admin', 'project_manager')
  ) as can_delete_as_admin
FROM report_queue rq
WHERE rq.id = 'YOUR_REPORT_ID';
*/

-- 3. Test actual deletion (BE CAREFUL - this will delete data!)
-- DELETE FROM report_queue WHERE id = 'test-report-id' RETURNING id, report_name;

-- ============================================
-- Troubleshooting
-- ============================================

-- If DELETE still doesn't work, check:

-- A. Is RLS enabled?
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'report_queue';
-- Expected: rowsecurity = true

-- B. Can you SELECT the report first?
-- If you can't SELECT it, you also can't DELETE it
-- SELECT id FROM report_queue WHERE id = 'your-report-id';

-- C. Are you in the organization?
-- SELECT * FROM organization_members WHERE user_id = auth.uid();

-- D. What's your role in the organization?
-- SELECT om.role, o.name
-- FROM organization_members om
-- JOIN organizations o ON o.id = om.organization_id
-- WHERE om.user_id = auth.uid();

-- ============================================
-- Performance Note
-- ============================================
-- This policy uses a subquery which is executed for each row.
-- For optimal performance, ensure these indexes exist:

-- CREATE INDEX IF NOT EXISTS idx_org_members_user_org
--   ON organization_members(user_id, organization_id);

-- CREATE INDEX IF NOT EXISTS idx_org_members_user_role
--   ON organization_members(user_id, role);

-- CREATE INDEX IF NOT EXISTS idx_report_queue_requested_by
--   ON report_queue(requested_by);

-- CREATE INDEX IF NOT EXISTS idx_report_queue_org_id
--   ON report_queue(organization_id);
