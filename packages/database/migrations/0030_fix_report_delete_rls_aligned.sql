-- Migration 0030: Align DELETE policy with SELECT policy for report_queue
-- Issue: Users can see reports from their organization but cannot delete them
-- Solution: Allow all organization members to delete reports (not just admins)
-- This aligns the DELETE policy with the SELECT policy for consistent behavior

-- ============================================
-- DROP EXISTING DELETE POLICY
-- ============================================
DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;
DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete own reports or organization reports with permission" ON report_queue;

-- ============================================
-- CREATE ALIGNED DELETE POLICY
-- ============================================
-- This policy now matches the SELECT policy:
-- Users can delete reports they requested OR reports from their organization

CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User can delete reports they requested
  requested_by = auth.uid()
  OR
  -- User can delete all reports from their organization(s)
  -- This matches the SELECT policy for consistency
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
    -- Note: No role restriction - all org members can delete org reports
  )
);

-- ============================================
-- ADD DOCUMENTATION
-- ============================================
COMMENT ON POLICY "report_queue_delete" ON report_queue IS
'Aligned with SELECT policy: Users can delete reports they requested OR reports from their organization. This ensures consistent visibility and deletion permissions.';

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the policy is correctly set:
/*
SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END as command,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd IN ('r', 'd')
ORDER BY polcmd;
*/

-- ============================================
-- NOTES
-- ============================================
-- Alternative approach (stricter): If you want only report owners to delete their reports,
-- use this policy instead:
--
-- CREATE POLICY "report_queue_delete"
-- ON report_queue
-- FOR DELETE
-- TO authenticated
-- USING (requested_by = auth.uid());
--
-- However, this requires also updating the SELECT policy to match, or users will see
-- reports they cannot delete, leading to confusing UX.
