-- ============================================
-- DEBUG RLS EXECUTION CONTEXT
-- ============================================
-- Run this in Supabase SQL Editor (authenticated as the user)
-- This will help us understand WHY the DELETE is blocked

-- Set up test context
DO $$
DECLARE
  v_user_id uuid := 'e0d66753-ccce-4920-9b53-56e1112c2f66';
  v_report_id uuid := '5e34a657-dcf6-412a-8e00-2ce1cf27af9e';
  v_org_id uuid := '470d6cc4-2565-46d9-967e-c6b148f81954';
BEGIN
  RAISE NOTICE '=== TEST CONTEXT ===';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Report ID: %', v_report_id;
  RAISE NOTICE 'Org ID: %', v_org_id;
END $$;

-- 1. Check what auth.uid() returns RIGHT NOW in SQL Editor
SELECT
  '=== CURRENT AUTH CONTEXT ===' AS section,
  auth.uid() AS current_auth_uid,
  CASE
    WHEN auth.uid() IS NULL THEN '❌ NULL - SQL Editor has no auth context'
    ELSE '✅ Has auth context'
  END AS status;

-- 2. Check if the report exists AT ALL (bypassing RLS)
SELECT
  '=== REPORT EXISTS CHECK (No RLS) ===' AS section,
  COUNT(*) AS report_count,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ Report does not exist in database'
    ELSE '✅ Report exists'
  END AS status
FROM report_queue
WHERE id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e';

-- 3. Show the actual report data (bypassing RLS)
SELECT
  '=== REPORT DATA (No RLS) ===' AS section,
  id,
  title,
  organization_id,
  requested_by,
  CASE
    WHEN organization_id = '470d6cc4-2565-46d9-967e-c6b148f81954' THEN '✅ Matches user org'
    ELSE '❌ Different org: ' || organization_id::text
  END AS org_match,
  CASE
    WHEN requested_by = 'e0d66753-ccce-4920-9b53-56e1112c2f66' THEN '✅ Requested by user'
    ELSE '❌ Requested by: ' || requested_by::text
  END AS user_match
FROM report_queue
WHERE id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e';

-- 4. Check if user is actually a member of the org
SELECT
  '=== USER ORG MEMBERSHIP CHECK ===' AS section,
  COUNT(*) AS membership_count,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ User is NOT a member of org 470d6cc4-2565-46d9-967e-c6b148f81954'
    ELSE '✅ User IS a member'
  END AS status,
  array_agg(role) AS roles
FROM organization_members
WHERE user_id = 'e0d66753-ccce-4920-9b53-56e1112c2f66'
  AND organization_id = '470d6cc4-2565-46d9-967e-c6b148f81954';

-- 5. Show DELETE policy expression again
SELECT
  '=== DELETE POLICY EXPRESSION ===' AS section,
  polname AS policy_name,
  pg_get_expr(polqual, polrelid) AS using_expression,
  polpermissive AS is_permissive
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';

-- 6. Test the DELETE policy logic manually (simulating RLS)
WITH user_orgs AS (
  SELECT organization_id
  FROM organization_members
  WHERE user_id = 'e0d66753-ccce-4920-9b53-56e1112c2f66'
)
SELECT
  '=== MANUAL DELETE POLICY TEST ===' AS section,
  r.id,
  r.requested_by,
  r.organization_id,
  CASE
    WHEN r.requested_by = 'e0d66753-ccce-4920-9b53-56e1112c2f66' THEN '✅ requested_by matches'
    ELSE '❌ requested_by does not match'
  END AS requested_by_check,
  CASE
    WHEN r.organization_id IN (SELECT organization_id FROM user_orgs) THEN '✅ organization_id matches'
    ELSE '❌ organization_id does not match'
  END AS org_check,
  CASE
    WHEN r.requested_by = 'e0d66753-ccce-4920-9b53-56e1112c2f66'
         OR r.organization_id IN (SELECT organization_id FROM user_orgs)
    THEN '✅ SHOULD BE DELETABLE'
    ELSE '❌ SHOULD BE BLOCKED'
  END AS final_result
FROM report_queue r
WHERE r.id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e';

-- 7. Check if there are MULTIPLE DELETE policies (conflict)
SELECT
  '=== DELETE POLICY COUNT ===' AS section,
  COUNT(*) AS policy_count,
  array_agg(polname) AS policy_names,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ NO DELETE POLICY EXISTS'
    WHEN COUNT(*) = 1 THEN '✅ Exactly 1 DELETE policy'
    ELSE '❌ MULTIPLE DELETE POLICIES - CONFLICT!'
  END AS diagnosis
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';

-- 8. Check if RLS is enabled
SELECT
  '=== RLS STATUS ===' AS section,
  relrowsecurity AS rls_enabled,
  CASE
    WHEN relrowsecurity = true THEN '✅ RLS is enabled'
    ELSE '❌ RLS is disabled'
  END AS status
FROM pg_class
WHERE oid = 'report_queue'::regclass;

-- 9. Check for any RESTRICTIVE policies (these use AND logic instead of OR)
SELECT
  '=== RESTRICTIVE POLICIES CHECK ===' AS section,
  polname AS policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'd' THEN 'DELETE'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
  END AS operation,
  polpermissive,
  CASE
    WHEN polpermissive = false THEN '⚠️ RESTRICTIVE - uses AND logic (blocks access)'
    ELSE '✅ PERMISSIVE - uses OR logic (grants access)'
  END AS policy_type
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd, polpermissive;

-- 10. FINAL DIAGNOSTIC: Try to understand the exact blocking reason
SELECT
  '=== FINAL DIAGNOSTIC ===' AS section,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM report_queue WHERE id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e')
      THEN '❌ REPORT DOES NOT EXIST'
    WHEN (SELECT COUNT(*) FROM pg_policy WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd') = 0
      THEN '❌ NO DELETE POLICY EXISTS'
    WHEN (SELECT COUNT(*) FROM pg_policy WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd') > 1
      THEN '❌ MULTIPLE DELETE POLICIES EXIST (CONFLICT)'
    WHEN EXISTS (
      SELECT 1 FROM pg_policy
      WHERE polrelid = 'report_queue'::regclass
        AND polcmd = 'd'
        AND polpermissive = false
    )
      THEN '⚠️ RESTRICTIVE DELETE POLICY EXISTS (blocks by default)'
    WHEN NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = 'e0d66753-ccce-4920-9b53-56e1112c2f66'
        AND organization_id = (SELECT organization_id FROM report_queue WHERE id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e')
    ) AND (
      SELECT requested_by FROM report_queue WHERE id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e'
    ) != 'e0d66753-ccce-4920-9b53-56e1112c2f66'
      THEN '❌ USER HAS NO ACCESS (not in org, did not request)'
    ELSE '✅ ALL CHECKS PASS - DELETE SHOULD WORK (Issue is with auth.uid() in API context)'
  END AS diagnosis;
