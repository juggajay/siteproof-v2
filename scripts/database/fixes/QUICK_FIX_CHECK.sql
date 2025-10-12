-- Quick check: Which reports does this user actually have access to?
SET ROLE postgres;

SELECT
  'Reports user CAN see (bypassing RLS)' as check_type,
  id,
  report_name,
  status,
  requested_at,
  CASE
    WHEN organization_id = '470d6cc4-2565-46d9-967e-c6b148f81954' THEN '✅ User org'
    ELSE '❌ Diff org'
  END as org_match,
  CASE
    WHEN requested_by = 'e0d66753-ccce-4920-9b53-56e1112c2f66' THEN '✅ User requested'
    ELSE '❌ Someone else'
  END as requester_match
FROM report_queue
WHERE organization_id = '470d6cc4-2565-46d9-967e-c6b148f81954'
   OR requested_by = 'e0d66753-ccce-4920-9b53-56e1112c2f66'
ORDER BY requested_at DESC
LIMIT 10;

RESET ROLE;
