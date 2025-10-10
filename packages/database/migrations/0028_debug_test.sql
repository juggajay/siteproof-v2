-- Debug test script to identify where the migration is failing
-- Run this BEFORE applying the migrations to understand the current state

-- 1. Check if auth schema exists
SELECT EXISTS (
  SELECT 1 FROM pg_namespace WHERE nspname = 'auth'
) AS auth_schema_exists;

-- 2. Check if auth.uid() function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'auth' AND p.proname = 'uid'
) AS auth_uid_exists;

-- 3. Check current policies on report_queue
SELECT
  polname AS policy_name,
  polcmd AS command,
  pg_get_expr(polqual, polrelid) AS using_clause,
  pg_get_expr(polwithcheck, polrelid) AS with_check_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polname;

-- 4. Check if report_queue table exists and has RLS enabled
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname = 'report_queue';

-- 5. Check if can_delete_report function already exists
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'can_delete_report'
ORDER BY p.proname, pg_get_function_arguments(p.oid);

-- 6. Check organization_members table structure (for the policy)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_members'
  AND column_name IN ('user_id', 'organization_id', 'role')
ORDER BY ordinal_position;

-- 7. Test if we can create a simple function that uses auth.uid()
DO $$
BEGIN
  -- Try to create a test function
  BEGIN
    EXECUTE 'CREATE OR REPLACE FUNCTION test_auth_uid() RETURNS UUID AS $func$
    BEGIN
      RETURN auth.uid();
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER';

    RAISE NOTICE 'Successfully created function using auth.uid()';

    -- Clean up test function
    EXECUTE 'DROP FUNCTION IF EXISTS test_auth_uid()';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Failed to create function using auth.uid(): %', SQLERRM;
  END;
END $$;

-- 8. Check if there are any existing views referencing report_queue
SELECT
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE definition LIKE '%report_queue%';

-- 9. Check current user and permissions
SELECT
  current_user,
  session_user,
  has_database_privilege(current_database(), 'CREATE') AS can_create,
  has_schema_privilege('public', 'CREATE') AS can_create_in_public;

-- 10. Test creating a function without auth.uid() to isolate the issue
DO $$
BEGIN
  BEGIN
    EXECUTE 'CREATE OR REPLACE FUNCTION test_simple_function(p_id UUID)
    RETURNS BOOLEAN AS $func$
    BEGIN
      RETURN TRUE;
    END;
    $func$ LANGUAGE plpgsql';

    RAISE NOTICE 'Successfully created simple function without auth.uid()';

    -- Clean up
    EXECUTE 'DROP FUNCTION IF EXISTS test_simple_function(UUID)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Failed to create simple function: %', SQLERRM;
  END;
END $$;