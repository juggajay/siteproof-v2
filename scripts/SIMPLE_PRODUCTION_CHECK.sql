-- ============================================
-- SIMPLE PRODUCTION CHECK
-- ============================================
-- Run this in Supabase SQL Editor (while authenticated)

-- 1. Check if reports exist in database
SELECT
  'Total reports in database' AS check_type,
  COUNT(*) AS count
FROM report_queue;

-- 2. Check test report specifically
SELECT
  'Test report exists' AS check_type,
  COUNT(*) AS count
FROM report_queue
WHERE id = '1766da85-1cda-4486-88a1-7981e407b7d8'::uuid;

-- 3. Check reports visible to current user (simulates what API should return)
SELECT
  'Reports visible to current user' AS check_type,
  COUNT(*) AS count
FROM report_queue
WHERE requested_by = auth.uid()
  OR organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  );

-- 4. Show actual reports (if any)
SELECT
  id,
  title,
  report_type,
  status,
  requested_at
FROM report_queue
WHERE requested_by = auth.uid()
  OR organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
ORDER BY requested_at DESC
LIMIT 10;

-- 5. Check RLS policies
SELECT
  polname AS policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'd' THEN 'DELETE'
  END AS operation
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd IN ('r', 'd');
