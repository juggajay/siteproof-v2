-- ============================================
-- PRODUCTION FINAL DIAGNOSTIC & FIX
-- ============================================
-- Run this in Supabase SQL Editor for production
-- This will diagnose AND fix the report deletion issue

-- ============================================
-- PART 1: DIAGNOSTIC - Current State Analysis
-- ============================================

-- 1. Check current RLS policies
SELECT
  '=== CURRENT RLS POLICIES ===' AS section,
  polname AS policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'd' THEN 'DELETE'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
  END AS operation,
  pg_get_expr(polqual, polrelid) AS policy_expression,
  CASE
    WHEN polcmd = 'd' AND pg_get_expr(polqual, polrelid) LIKE '%role = ANY%'
      THEN '❌ MISALIGNED - Has role restriction (Migration 0029 bug)'
    WHEN polcmd = 'd' AND pg_get_expr(polqual, polrelid) NOT LIKE '%role = ANY%'
      THEN '✅ ALIGNED - No role restriction (Fixed)'
    WHEN polcmd = 'r'
      THEN 'SELECT policy (reference)'
    ELSE 'Other policy'
  END AS status
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY
  CASE polcmd
    WHEN 'r' THEN 1
    WHEN 'd' THEN 2
    WHEN 'a' THEN 3
    WHEN 'w' THEN 4
  END;

-- 2. Check if there are multiple DELETE policies (conflict)
SELECT
  '=== DELETE POLICY COUNT ===' AS section,
  COUNT(*) AS delete_policy_count,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ CRITICAL: No DELETE policy exists'
    WHEN COUNT(*) = 1 THEN '✅ Good: Exactly 1 DELETE policy'
    WHEN COUNT(*) > 1 THEN '❌ CONFLICT: Multiple DELETE policies exist'
  END AS diagnosis
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';

-- 3. Check if SELECT and DELETE policies are aligned
WITH policy_comparison AS (
  SELECT
    CASE polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'd' THEN 'DELETE'
    END AS operation,
    pg_get_expr(polqual, polrelid) AS expression
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass
    AND polcmd IN ('r', 'd')
)
SELECT
  '=== POLICY ALIGNMENT CHECK ===' AS section,
  CASE
    WHEN (SELECT COUNT(DISTINCT expression) FROM policy_comparison) = 1
      THEN '✅ ALIGNED: SELECT and DELETE use same logic'
    ELSE '❌ MISALIGNED: SELECT and DELETE have different logic'
  END AS alignment_status,
  (SELECT expression FROM policy_comparison WHERE operation = 'SELECT') AS select_expression,
  (SELECT expression FROM policy_comparison WHERE operation = 'DELETE') AS delete_expression;

-- 4. Check reports in production
SELECT
  '=== REPORTS IN DATABASE ===' AS section,
  COUNT(*) AS total_reports,
  COUNT(DISTINCT organization_id) AS distinct_orgs,
  COUNT(DISTINCT requested_by) AS distinct_users,
  CASE
    WHEN COUNT(*) = 0 THEN '⚠️ No reports exist in database'
    ELSE '✅ Reports exist'
  END AS status
FROM report_queue;

-- 5. Sample reports (to see if test report exists)
SELECT
  '=== SAMPLE REPORTS ===' AS section,
  id,
  title,
  report_type,
  status,
  organization_id,
  requested_at,
  CASE
    WHEN id = '1766da85-1cda-4486-88a1-7981e407b7d8'::uuid
      THEN '← TEST REPORT'
    ELSE ''
  END AS note
FROM report_queue
ORDER BY requested_at DESC
LIMIT 5;

-- ============================================
-- PART 2: THE FIX - Apply if policies are misaligned
-- ============================================
-- Run this section ONLY if diagnostic shows misalignment

/*
-- UNCOMMENT THIS SECTION TO APPLY THE FIX:

BEGIN;

-- Drop ALL existing policies to ensure clean state
DO $$
DECLARE
  policy_rec RECORD;
BEGIN
  FOR policy_rec IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'report_queue'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON report_queue', policy_rec.polname);
    RAISE NOTICE 'Dropped policy: %', policy_rec.polname;
  END LOOP;
END $$;

-- Create aligned SELECT policy
CREATE POLICY "report_queue_select"
ON report_queue
FOR SELECT
TO authenticated
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Create aligned DELETE policy (matches SELECT exactly)
CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Create INSERT policy
CREATE POLICY "report_queue_insert"
ON report_queue
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
  AND requested_by = auth.uid()
);

-- Create UPDATE policy
CREATE POLICY "report_queue_update"
ON report_queue
FOR UPDATE
TO authenticated
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id = (SELECT organization_id FROM report_queue WHERE id = report_queue.id)
);

-- Verify fix
SELECT
  '=== FIX VERIFICATION ===' AS section,
  CASE
    WHEN (
      SELECT COUNT(DISTINCT pg_get_expr(polqual, polrelid))
      FROM pg_policy
      WHERE polrelid = 'report_queue'::regclass
        AND polcmd IN ('r', 'd')
    ) = 1
    THEN '✅ SUCCESS: Policies are now aligned'
    ELSE '❌ FAILED: Policies still misaligned'
  END AS result;

COMMIT;

*/

-- ============================================
-- PART 3: TEST DELETE (Safe - uses ROLLBACK)
-- ============================================
-- This tests if DELETE works without actually deleting anything

/*
-- UNCOMMENT TO TEST (after applying fix):

BEGIN;

-- Attempt to delete test report
WITH delete_attempt AS (
  DELETE FROM report_queue
  WHERE id = '1766da85-1cda-4486-88a1-7981e407b7d8'::uuid
  RETURNING *
)
SELECT
  '=== DELETE TEST ===' AS section,
  COUNT(*) AS rows_affected,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ DELETE BLOCKED: RLS policy is preventing deletion'
    WHEN COUNT(*) = 1 THEN '✅ DELETE WORKS: RLS policy allows deletion'
    ELSE '⚠️ UNEXPECTED: Multiple rows affected'
  END AS result
FROM delete_attempt;

-- Don't commit - this is just a test
ROLLBACK;

*/

-- ============================================
-- PART 4: USER-SPECIFIC DIAGNOSTIC
-- ============================================
-- Check auth context and memberships for current user

SELECT
  '=== CURRENT USER INFO ===' AS section,
  auth.uid() AS user_id,
  CASE
    WHEN auth.uid() IS NULL THEN '❌ No authenticated user (run in Supabase SQL Editor as authenticated user)'
    ELSE '✅ User authenticated'
  END AS auth_status;

SELECT
  '=== USER ORGANIZATIONS ===' AS section,
  organization_id,
  role,
  o.name AS org_name
FROM organization_members om
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = auth.uid();

-- ============================================
-- SUMMARY AND RECOMMENDATIONS
-- ============================================
SELECT
  '=== DIAGNOSTIC SUMMARY ===' AS section,
  CASE
    -- Check if DELETE policy exists
    WHEN (SELECT COUNT(*) FROM pg_policy WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd') = 0
      THEN '❌ CRITICAL: No DELETE policy exists. Apply the fix section above.'
    -- Check if DELETE policy has role restriction
    WHEN EXISTS (
      SELECT 1 FROM pg_policy
      WHERE polrelid = 'report_queue'::regclass
        AND polcmd = 'd'
        AND pg_get_expr(polqual, polrelid) LIKE '%role = ANY%'
    )
      THEN '❌ BUG CONFIRMED: DELETE policy has role restriction (Migration 0029). Apply fix section above.'
    -- Check if policies are aligned
    WHEN (
      SELECT COUNT(DISTINCT pg_get_expr(polqual, polrelid))
      FROM pg_policy
      WHERE polrelid = 'report_queue'::regclass
        AND polcmd IN ('r', 'd')
    ) > 1
      THEN '❌ MISALIGNED: SELECT and DELETE policies differ. Apply fix section above.'
    -- All good
    ELSE '✅ POLICIES ARE CORRECT: If reports still don''t appear, it''s a caching issue, not RLS.'
  END AS diagnosis,
  'If diagnosis shows problems, uncomment and run PART 2 (THE FIX) section above.' AS action_required;
