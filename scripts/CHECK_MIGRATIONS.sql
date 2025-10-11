-- Check migration tracking tables
-- Supabase uses different table names for tracking migrations

-- Try schema_migrations (common name)
SELECT * FROM schema_migrations
WHERE version LIKE '%0032%'
ORDER BY version DESC
LIMIT 10;

-- If that doesn't work, list all tables in public schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%migration%'
ORDER BY table_name;

-- Also check what RLS policies are ACTUALLY active right now
SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'd' THEN 'DELETE'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
  END as operation,
  pg_get_expr(polqual, polrelid) as policy_expression,
  polpermissive as is_permissive
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd;
