-- ============================================
-- VERIFY REPORT DATA - NO RLS
-- ============================================
-- This bypasses RLS to see the raw report data
-- Run this in Supabase SQL Editor

SET ROLE postgres;  -- Bypass RLS by using postgres superuser role

-- 1. Check if the specific report exists
SELECT
  '=== REPORT 5e34a657-dcf6-412a-8e00-2ce1cf27af9e EXISTS? ===' AS section,
  COUNT(*) AS count,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ Report does NOT exist in database'
    ELSE '✅ Report exists'
  END AS status
FROM report_queue
WHERE id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e';

-- 2. Show the full report data
SELECT
  '=== REPORT DATA (No RLS) ===' AS section,
  id,
  report_name,
  report_type,
  status,
  organization_id,
  requested_by,
  requested_at,
  created_at
FROM report_queue
WHERE id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e';

-- 3. Verify user exists and org membership
SELECT
  '=== USER e0d66753-ccce-4920-9b53-56e1112c2f66 ===' AS section,
  u.id,
  u.email,
  CASE
    WHEN u.id IS NULL THEN '❌ User does not exist'
    ELSE '✅ User exists'
  END AS user_status
FROM auth.users u
WHERE u.id = 'e0d66753-ccce-4920-9b53-56e1112c2f66';

-- 4. Check organization membership
SELECT
  '=== USER ORG MEMBERSHIP ===' AS section,
  om.user_id,
  om.organization_id,
  om.role,
  o.name AS org_name,
  CASE
    WHEN om.organization_id = '470d6cc4-2565-46d9-967e-c6b148f81954' THEN '✅ Matches expected org'
    ELSE '❌ Different org'
  END AS org_match
FROM organization_members om
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = 'e0d66753-ccce-4920-9b53-56e1112c2f66';

-- 5. CRITICAL: Check if report's org matches user's org
SELECT
  '=== ORG ALIGNMENT CHECK ===' AS section,
  r.organization_id AS report_org,
  om.organization_id AS user_org,
  CASE
    WHEN r.organization_id = om.organization_id THEN '✅ MATCH - RLS should allow'
    WHEN r.organization_id IS NULL THEN '❌ Report has NULL organization_id'
    WHEN om.organization_id IS NULL THEN '❌ User has no org membership'
    ELSE '❌ MISMATCH - Report org: ' || r.organization_id::text || ' vs User org: ' || om.organization_id::text
  END AS diagnosis
FROM report_queue r
CROSS JOIN organization_members om
WHERE r.id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e'
  AND om.user_id = 'e0d66753-ccce-4920-9b53-56e1112c2f66';

-- 6. Check if requested_by matches
SELECT
  '=== REQUESTED_BY CHECK ===' AS section,
  r.requested_by AS report_requested_by,
  'e0d66753-ccce-4920-9b53-56e1112c2f66' AS user_id,
  CASE
    WHEN r.requested_by = 'e0d66753-ccce-4920-9b53-56e1112c2f66' THEN '✅ MATCH - User requested this report'
    WHEN r.requested_by IS NULL THEN '❌ Report has NULL requested_by'
    ELSE '❌ MISMATCH - Different user requested: ' || r.requested_by::text
  END AS diagnosis
FROM report_queue r
WHERE r.id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e';

-- 7. Simulate the RLS policy logic manually
WITH user_orgs AS (
  SELECT organization_id
  FROM organization_members
  WHERE user_id = 'e0d66753-ccce-4920-9b53-56e1112c2f66'
)
SELECT
  '=== RLS POLICY SIMULATION ===' AS section,
  r.id,
  r.requested_by,
  r.organization_id,
  EXISTS(SELECT 1 FROM user_orgs WHERE organization_id = r.organization_id) AS org_match,
  (r.requested_by = 'e0d66753-ccce-4920-9b53-56e1112c2f66') AS requested_by_match,
  CASE
    WHEN r.requested_by = 'e0d66753-ccce-4920-9b53-56e1112c2f66'
      THEN '✅ Would pass RLS (requested_by match)'
    WHEN EXISTS(SELECT 1 FROM user_orgs WHERE organization_id = r.organization_id)
      THEN '✅ Would pass RLS (org match)'
    ELSE '❌ Would FAIL RLS (no match on either condition)'
  END AS rls_result
FROM report_queue r
WHERE r.id = '5e34a657-dcf6-412a-8e00-2ce1cf27af9e';

-- Reset role
RESET ROLE;
