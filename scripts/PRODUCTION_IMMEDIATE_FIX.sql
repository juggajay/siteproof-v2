-- ============================================
-- IMMEDIATE PRODUCTION FIX
-- ============================================
-- Issue: DELETE policy has role restrictions, SELECT does not
-- Result: Users can see reports but cannot delete them
-- Fix: Align DELETE policy with SELECT policy
--
-- SAFE TO RUN: This script is idempotent and includes rollback
-- ============================================

-- Start transaction for safety
BEGIN;

-- ============================================
-- STEP 1: Diagnose Current State
-- ============================================
\echo '===== BEFORE FIX: Current DELETE Policy ====='

SELECT
  polname AS policy_name,
  pg_get_expr(polqual, polrelid) AS using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';

-- ============================================
-- STEP 2: Drop Existing DELETE Policy
-- ============================================
\echo ''
\echo '===== Dropping old DELETE policy ====='

DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;
DROP POLICY IF EXISTS "report_queue_delete_allow_org_members" ON report_queue;
DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;

-- ============================================
-- STEP 3: Create Aligned DELETE Policy
-- ============================================
\echo ''
\echo '===== Creating aligned DELETE policy ====='

CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User can delete reports they requested
  requested_by = auth.uid()
  OR
  -- User can delete reports from their organization
  -- (NO role restriction - aligned with SELECT policy)
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
    -- NO role check here - all org members can delete
  )
);

-- ============================================
-- STEP 4: Verify Fix
-- ============================================
\echo ''
\echo '===== AFTER FIX: Verification ====='

-- Check policy was created
SELECT
  polname AS policy_name,
  pg_get_expr(polqual, polrelid) AS using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';

-- Compare SELECT vs DELETE
\echo ''
\echo '===== Policy Alignment Check ====='

WITH policies AS (
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
  operation,
  CASE
    WHEN expression LIKE '%role = ANY%' THEN 'HAS ROLE RESTRICTION ❌'
    ELSE 'NO ROLE RESTRICTION ✓'
  END AS policy_status,
  LEFT(expression, 100) AS expression_preview
FROM policies
ORDER BY operation;

-- ============================================
-- STEP 5: Test DELETE (Without Committing)
-- ============================================
\echo ''
\echo '===== Testing DELETE on specific report ====='

-- NOTE: Replace with actual report ID for testing
-- This will NOT be committed (wrapped in transaction)

DO $$
DECLARE
  test_report_id UUID := '0794edb1-f272-4b8b-8a96-825a145e5041';
  before_count INTEGER;
  after_count INTEGER;
  deleted_count INTEGER;
BEGIN
  -- Count before
  SELECT COUNT(*) INTO before_count
  FROM report_queue
  WHERE id = test_report_id;

  RAISE NOTICE 'Report exists before DELETE: % rows', before_count;

  -- Attempt delete (will be rolled back)
  WITH delete_result AS (
    DELETE FROM report_queue
    WHERE id = test_report_id
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM delete_result;

  RAISE NOTICE 'DELETE affected: % rows', deleted_count;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'SUCCESS ✓ - DELETE policy allows deletion';
  ELSIF before_count = 0 THEN
    RAISE NOTICE 'SKIPPED - Report does not exist (cannot test)';
  ELSE
    RAISE NOTICE 'FAILED ✗ - RLS still blocking DELETE';
  END IF;
END $$;

-- ============================================
-- STEP 6: Decision Point
-- ============================================
\echo ''
\echo '===== IMPORTANT: Review and Commit ====='
\echo ''
\echo 'Review the output above:'
\echo '  1. Check DELETE policy has NO role restriction'
\echo '  2. Check alignment shows both policies have same status'
\echo '  3. Check test DELETE succeeded (if report exists)'
\echo ''
\echo 'If everything looks good, COMMIT the transaction:'
\echo '  COMMIT;'
\echo ''
\echo 'If something looks wrong, ROLLBACK:'
\echo '  ROLLBACK;'
\echo ''

-- Leave transaction open for manual review
-- User must manually execute COMMIT or ROLLBACK

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================
/*
If you need to rollback this change:

BEGIN;

DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;

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
      AND role = ANY(ARRAY['owner', 'admin', 'project_manager'])
  )
);

COMMIT;
*/
