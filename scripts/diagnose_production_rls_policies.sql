-- ============================================
-- PRODUCTION RLS DIAGNOSIS SCRIPT
-- ============================================
-- Purpose: Diagnose exactly why DELETE returns 0 rows in production
-- Context: User sees report in GET, but DELETE affects 0 rows
-- Report ID: 0794edb1-f272-4b8b-8a96-825a145e5041

-- ============================================
-- STEP 1: Check what RLS policies exist
-- ============================================
\echo '===== CURRENT RLS POLICIES ON report_queue ====='

SELECT
  polname AS policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    ELSE polcmd::text
  END AS operation,
  polroles::regrole[] AS roles,
  pg_get_expr(polqual, polrelid) AS using_clause,
  pg_get_expr(polwithcheck, polrelid) AS with_check_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY
  CASE polcmd
    WHEN 'r' THEN 1
    WHEN 'd' THEN 2
    WHEN 'a' THEN 3
    WHEN 'w' THEN 4
  END,
  polname;

-- ============================================
-- STEP 2: Compare SELECT vs DELETE policy expressions
-- ============================================
\echo ''
\echo '===== POLICY ALIGNMENT CHECK ====='

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
  expression,
  CASE
    WHEN operation = 'SELECT' AND expression = (SELECT expression FROM policies WHERE operation = 'DELETE')
      THEN 'ALIGNED ✓'
    WHEN operation = 'DELETE' AND expression = (SELECT expression FROM policies WHERE operation = 'SELECT')
      THEN 'ALIGNED ✓'
    ELSE 'MISALIGNED ✗'
  END AS alignment_status
FROM policies
ORDER BY operation;

-- ============================================
-- STEP 3: Check specific report (replace with actual report ID)
-- ============================================
\echo ''
\echo '===== SPECIFIC REPORT CHECK ====='

-- NOTE: Replace this UUID with the actual report ID
DO $$
DECLARE
  v_report_id UUID := '0794edb1-f272-4b8b-8a96-825a145e5041';
  v_user_id UUID := auth.uid();
  v_report RECORD;
BEGIN
  RAISE NOTICE 'Current user ID: %', v_user_id;

  -- Get report details (bypassing RLS with SECURITY DEFINER context)
  SELECT * INTO v_report
  FROM report_queue
  WHERE id = v_report_id;

  IF FOUND THEN
    RAISE NOTICE 'Report exists:';
    RAISE NOTICE '  ID: %', v_report.id;
    RAISE NOTICE '  Organization: %', v_report.organization_id;
    RAISE NOTICE '  Requested by: %', v_report.requested_by;
    RAISE NOTICE '  Report name: %', v_report.report_name;
  ELSE
    RAISE NOTICE 'Report does not exist in database';
  END IF;
END $$;

-- ============================================
-- STEP 4: Test RLS policies with current user
-- ============================================
\echo ''
\echo '===== RLS POLICY TEST ====='

-- Test if user can SELECT the report
SELECT
  'Can user SELECT report?' AS test,
  COUNT(*) AS result,
  CASE
    WHEN COUNT(*) > 0 THEN 'YES - User can see this report'
    ELSE 'NO - RLS blocks SELECT'
  END AS interpretation
FROM report_queue
WHERE id = '0794edb1-f272-4b8b-8a96-825a145e5041';

-- ============================================
-- STEP 5: Check user's organization memberships
-- ============================================
\echo ''
\echo '===== USER ORGANIZATION MEMBERSHIPS ====='

SELECT
  om.organization_id,
  om.role,
  o.name AS organization_name,
  om.created_at
FROM organization_members om
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = auth.uid()
ORDER BY om.created_at DESC;

-- ============================================
-- STEP 6: Test DELETE policy logic manually
-- ============================================
\echo ''
\echo '===== MANUAL DELETE POLICY EVALUATION ====='

WITH report_data AS (
  SELECT
    id,
    organization_id,
    requested_by,
    report_name
  FROM report_queue
  WHERE id = '0794edb1-f272-4b8b-8a96-825a145e5041'
),
user_info AS (
  SELECT
    auth.uid() AS current_user_id,
    ARRAY_AGG(organization_id) AS user_orgs
  FROM organization_members
  WHERE user_id = auth.uid()
  GROUP BY auth.uid()
)
SELECT
  'DELETE Policy Check' AS test_name,
  rd.id AS report_id,
  rd.organization_id AS report_org,
  rd.requested_by AS report_owner,
  ui.current_user_id,
  ui.user_orgs AS user_organizations,
  -- Check 1: User owns the report
  (rd.requested_by = ui.current_user_id) AS user_owns_report,
  -- Check 2: User is in same organization
  (rd.organization_id = ANY(ui.user_orgs)) AS user_in_same_org,
  -- Final verdict (should match DELETE policy USING clause)
  (
    rd.requested_by = ui.current_user_id
    OR
    rd.organization_id = ANY(ui.user_orgs)
  ) AS should_allow_delete
FROM report_data rd
CROSS JOIN user_info ui;

-- ============================================
-- STEP 7: Use debug function if exists
-- ============================================
\echo ''
\echo '===== DEBUG FUNCTION OUTPUT (if available) ====='

-- Check if debug function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'debug_report_access'
  ) THEN
    RAISE NOTICE 'debug_report_access function exists - run:';
    RAISE NOTICE 'SELECT * FROM debug_report_access(NULL, ''0794edb1-f272-4b8b-8a96-825a145e5041''::uuid);';
  ELSE
    RAISE NOTICE 'debug_report_access function not found - apply migration 0032';
  END IF;
END $$;

-- ============================================
-- STEP 8: Attempt actual DELETE with count
-- ============================================
\echo ''
\echo '===== ACTUAL DELETE TEST (WITH ROLLBACK) ====='

BEGIN;

-- Attempt delete
WITH delete_result AS (
  DELETE FROM report_queue
  WHERE id = '0794edb1-f272-4b8b-8a96-825a145e5041'
  RETURNING *
)
SELECT
  'Delete Result' AS test,
  COUNT(*) AS rows_affected,
  CASE
    WHEN COUNT(*) > 0 THEN 'SUCCESS - RLS allows DELETE'
    ELSE 'FAILED - RLS blocked DELETE (0 rows affected)'
  END AS interpretation
FROM delete_result;

-- Rollback to prevent actual deletion
ROLLBACK;

-- ============================================
-- DIAGNOSTIC SUMMARY
-- ============================================
\echo ''
\echo '===== DIAGNOSTIC SUMMARY ====='
\echo 'If DELETE shows 0 rows affected but SELECT shows 1 row:'
\echo '  → The DELETE policy USING clause is MORE RESTRICTIVE than SELECT policy'
\echo '  → Most likely causes:'
\echo '     1. DELETE requires admin/owner role, SELECT does not'
\echo '     2. Migration 0032 not applied (policies misaligned)'
\echo '     3. Migration 0029 applied AFTER 0030/0031 (conflicting policies)'
\echo ''
\echo 'RECOMMENDED FIX:'
\echo '  Apply migration 0032: /packages/database/migrations/0032_ensure_report_rls_alignment.sql'
\echo '  This will:'
\echo '    - Drop ALL existing policies'
\echo '    - Create aligned SELECT and DELETE policies'
\echo '    - Verify alignment automatically'
