-- Check the specific report that's failing to delete
SET ROLE postgres;

-- 1. Does this report exist?
SELECT
  '=== REPORT 9ddd3135-12c5-48a7-b544-f8a890ae337f ===' AS check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ Report does NOT exist'
    ELSE '✅ Report exists'
  END as status
FROM report_queue
WHERE id = '9ddd3135-12c5-48a7-b544-f8a890ae337f';

-- 2. Show the report details
SELECT
  id,
  report_name,
  report_type,
  status,
  organization_id,
  requested_by,
  requested_at,
  CASE
    WHEN organization_id = '470d6cc4-2565-46d9-967e-c6b148f81954' THEN '✅ Your org'
    ELSE '❌ Different org: ' || organization_id::text
  END as org_match,
  CASE
    WHEN requested_by = 'e0d66753-ccce-4920-9b53-56e1112c2f66' THEN '✅ You requested'
    ELSE '❌ Different user: ' || requested_by::text
  END as requester_match
FROM report_queue
WHERE id = '9ddd3135-12c5-48a7-b544-f8a890ae337f';

-- 3. Test RLS simulation
WITH user_orgs AS (
  SELECT organization_id
  FROM organization_members
  WHERE user_id = 'e0d66753-ccce-4920-9b53-56e1112c2f66'
)
SELECT
  '=== RLS CHECK ===' as check_type,
  CASE
    WHEN r.requested_by = 'e0d66753-ccce-4920-9b53-56e1112c2f66' THEN '✅ Would PASS (requested_by match)'
    WHEN EXISTS(SELECT 1 FROM user_orgs WHERE organization_id = r.organization_id) THEN '✅ Would PASS (org match)'
    ELSE '❌ Would FAIL - Report org: ' || r.organization_id::text || ', User orgs: ' || (SELECT string_agg(organization_id::text, ', ') FROM user_orgs)
  END as rls_result
FROM report_queue r
WHERE r.id = '9ddd3135-12c5-48a7-b544-f8a890ae337f';

RESET ROLE;
