-- List all reports that actually exist in production
-- This will help us test deletion with a REAL report

SET ROLE postgres;

-- Show all reports (bypassing RLS)
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
    ELSE '❌ Different org'
  END as org_match,
  CASE
    WHEN requested_by = 'e0d66753-ccce-4920-9b53-56e1112c2f66' THEN '✅ You requested'
    ELSE '❌ Someone else'
  END as requester_match
FROM report_queue
ORDER BY requested_at DESC
LIMIT 20;

-- Count reports by organization
SELECT
  organization_id,
  o.name as org_name,
  COUNT(*) as report_count
FROM report_queue rq
LEFT JOIN organizations o ON o.id = rq.organization_id
GROUP BY organization_id, o.name
ORDER BY report_count DESC;

RESET ROLE;
