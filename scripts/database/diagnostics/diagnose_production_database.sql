-- ========================================
-- SITEPROOF V2 - PRODUCTION DATABASE DIAGNOSTIC
-- ========================================
-- Purpose: Diagnose why report deletion works in test but not in production
-- Date: 2025-01-11
--
-- Run this script in your PRODUCTION Supabase SQL Editor to diagnose the issue
-- ========================================

-- Set the output format for better readability
\set QUIET 1
\timing on

-- ========================================
-- SECTION 1: MIGRATION STATUS CHECK
-- ========================================
\echo '========================================';
\echo 'SECTION 1: MIGRATION STATUS CHECK';
\echo '========================================';
\echo '';

-- Check if migrations table exists and show recent migrations
\echo 'Recent migrations (last 10):';
SELECT
    name,
    executed_at,
    hash,
    execution_time
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC
LIMIT 10;

\echo '';
\echo 'Checking for migration 0031:';
SELECT
    name,
    executed_at,
    hash,
    execution_time,
    CASE
        WHEN name LIKE '%0031%' THEN '✅ MIGRATION 0031 FOUND'
        ELSE '❌ NOT MIGRATION 0031'
    END as status
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%0031%' OR name LIKE '%report_queue%'
ORDER BY executed_at DESC;

-- ========================================
-- SECTION 2: CURRENT RLS POLICIES
-- ========================================
\echo '';
\echo '========================================';
\echo 'SECTION 2: CURRENT RLS POLICIES ON report_queue';
\echo '========================================';
\echo '';

-- List all policies on report_queue table
\echo 'All RLS policies on report_queue table:';
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as using_clause,
    with_check::text as with_check_clause,
    CASE
        WHEN policyname LIKE '%delete%' THEN '🗑️ DELETE POLICY'
        WHEN policyname LIKE '%select%' THEN '👁️ SELECT POLICY'
        WHEN policyname LIKE '%insert%' THEN '➕ INSERT POLICY'
        WHEN policyname LIKE '%update%' THEN '✏️ UPDATE POLICY'
        ELSE '❓ OTHER POLICY'
    END as policy_type
FROM pg_policies
WHERE tablename = 'report_queue'
ORDER BY cmd, policyname;

\echo '';
\echo 'DELETE policies specifically:';
SELECT
    policyname,
    permissive,
    roles,
    qual::text as using_clause,
    with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'report_queue'
    AND cmd = 'DELETE'
ORDER BY policyname;

-- Check for duplicate or conflicting policies
\echo '';
\echo 'Checking for duplicate DELETE policies:';
WITH policy_counts AS (
    SELECT
        cmd,
        COUNT(*) as policy_count,
        string_agg(policyname, ', ' ORDER BY policyname) as policy_names
    FROM pg_policies
    WHERE tablename = 'report_queue'
    GROUP BY cmd
)
SELECT
    cmd,
    policy_count,
    policy_names,
    CASE
        WHEN cmd = 'DELETE' AND policy_count > 1 THEN '⚠️ MULTIPLE DELETE POLICIES - POTENTIAL CONFLICT!'
        WHEN cmd = 'DELETE' AND policy_count = 0 THEN '❌ NO DELETE POLICY FOUND!'
        WHEN cmd = 'DELETE' AND policy_count = 1 THEN '✅ SINGLE DELETE POLICY'
        ELSE 'ℹ️ ' || policy_count || ' policies'
    END as status
FROM policy_counts
ORDER BY
    CASE cmd
        WHEN 'DELETE' THEN 1
        WHEN 'SELECT' THEN 2
        WHEN 'INSERT' THEN 3
        WHEN 'UPDATE' THEN 4
        ELSE 5
    END;

-- ========================================
-- SECTION 3: FUNCTION DEFINITIONS
-- ========================================
\echo '';
\echo '========================================';
\echo 'SECTION 3: FUNCTION DEFINITIONS';
\echo '========================================';
\echo '';

-- Check current_org_id() function
\echo 'current_org_id() function definition:';
SELECT
    proname as function_name,
    pronargs as arg_count,
    prorettype::regtype as return_type,
    prosrc as source_code
FROM pg_proc
WHERE proname = 'current_org_id'
    AND pronamespace = 'public'::regnamespace;

\echo '';
\echo 'current_user_role() function definition:';
SELECT
    proname as function_name,
    pronargs as arg_count,
    prorettype::regtype as return_type,
    prosrc as source_code
FROM pg_proc
WHERE proname = 'current_user_role'
    AND pronamespace = 'public'::regnamespace;

-- ========================================
-- SECTION 4: TABLE STRUCTURE & CONSTRAINTS
-- ========================================
\echo '';
\echo '========================================';
\echo 'SECTION 4: TABLE STRUCTURE & CONSTRAINTS';
\echo '========================================';
\echo '';

-- Check report_queue table structure
\echo 'report_queue table columns:';
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE
        WHEN column_name = 'id' THEN 'Primary Key'
        WHEN column_name = 'organization_id' THEN 'Organization Reference'
        WHEN column_name = 'created_by' THEN 'User Reference'
        WHEN column_name = 'status' THEN 'Report Status'
        ELSE ''
    END as column_purpose
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'report_queue'
ORDER BY ordinal_position;

\echo '';
\echo 'Foreign key constraints:';
SELECT
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.report_queue'::regclass
    AND contype = 'f';

-- ========================================
-- SECTION 5: CURRENT USER CONTEXT
-- ========================================
\echo '';
\echo '========================================';
\echo 'SECTION 5: CURRENT USER CONTEXT';
\echo '========================================';
\echo '';

-- Check current user context
\echo 'Current database user:';
SELECT
    current_user,
    session_user,
    current_database(),
    version() as postgres_version;

\echo '';
\echo 'Current JWT claims (if available):';
SELECT
    current_setting('request.jwt.claim.sub', true) as user_id,
    current_setting('request.jwt.claim.email', true) as email,
    current_setting('request.jwt.claim.role', true) as jwt_role,
    current_setting('request.jwt.claims', true)::json as all_claims;

\echo '';
\echo 'Testing helper functions with current context:';
SELECT
    'current_org_id()' as function_name,
    current_org_id() as result
UNION ALL
SELECT
    'current_user_role()' as function_name,
    current_user_role() as result;

-- ========================================
-- SECTION 6: SIMULATED DELETE TEST
-- ========================================
\echo '';
\echo '========================================';
\echo 'SECTION 6: SIMULATED DELETE TEST';
\echo '========================================';
\echo '';

-- Test what the DELETE policy would allow
\echo 'Testing DELETE policy conditions:';
WITH test_data AS (
    SELECT
        rq.id,
        rq.name,
        rq.status,
        rq.created_by,
        rq.organization_id,
        rq.created_at,
        -- Check if current user created this report
        (rq.created_by = auth.uid()) as is_creator,
        -- Check organization match
        (rq.organization_id = current_org_id()) as is_same_org,
        -- Check user role
        current_user_role() as user_role,
        -- Current auth user
        auth.uid() as current_user_id,
        -- Current org
        current_org_id() as current_org
    FROM report_queue rq
    WHERE rq.deleted_at IS NULL
    LIMIT 5
)
SELECT
    id,
    name,
    status,
    is_creator,
    is_same_org,
    user_role,
    CASE
        WHEN is_creator AND is_same_org THEN '✅ CAN DELETE (creator + same org)'
        WHEN NOT is_creator THEN '❌ CANNOT DELETE (not creator)'
        WHEN NOT is_same_org THEN '❌ CANNOT DELETE (different org)'
        ELSE '❓ UNKNOWN'
    END as delete_permission,
    created_at
FROM test_data
ORDER BY created_at DESC;

-- ========================================
-- SECTION 7: REALTIME SUBSCRIPTIONS
-- ========================================
\echo '';
\echo '========================================';
\echo 'SECTION 7: REALTIME SUBSCRIPTIONS';
\echo '========================================';
\echo '';

-- Check if realtime is enabled for the table
\echo 'Realtime configuration for report_queue:';
SELECT
    schemaname,
    tablename,
    publication_name
FROM pg_publication_tables
WHERE tablename = 'report_queue';

\echo '';
\echo 'Checking if table has realtime enabled in supabase_realtime:';
SELECT
    id,
    name,
    CASE
        WHEN name = 'report_queue' THEN '✅ REALTIME ENABLED'
        ELSE '❌ NOT CONFIGURED'
    END as status
FROM supabase_realtime.subscription
WHERE name = 'public:report_queue=*'
   OR name LIKE '%report_queue%';

-- ========================================
-- SECTION 8: POTENTIAL ISSUES SUMMARY
-- ========================================
\echo '';
\echo '========================================';
\echo 'SECTION 8: DIAGNOSTIC SUMMARY';
\echo '========================================';
\echo '';

-- Summary query to identify issues
WITH diagnostics AS (
    SELECT 'Migration 0031' as check_item,
           CASE
               WHEN EXISTS (
                   SELECT 1 FROM supabase_migrations.schema_migrations
                   WHERE name LIKE '%0031%'
               ) THEN 'PASSED ✅'
               ELSE 'FAILED ❌ - Migration not found'
           END as status
    UNION ALL
    SELECT 'DELETE Policy Count' as check_item,
           CASE
               WHEN (SELECT COUNT(*) FROM pg_policies
                     WHERE tablename = 'report_queue' AND cmd = 'DELETE') = 1
               THEN 'PASSED ✅'
               WHEN (SELECT COUNT(*) FROM pg_policies
                     WHERE tablename = 'report_queue' AND cmd = 'DELETE') > 1
               THEN 'FAILED ❌ - Multiple DELETE policies found'
               ELSE 'FAILED ❌ - No DELETE policy found'
           END as status
    UNION ALL
    SELECT 'current_org_id() Function' as check_item,
           CASE
               WHEN EXISTS (
                   SELECT 1 FROM pg_proc
                   WHERE proname = 'current_org_id'
                   AND pronamespace = 'public'::regnamespace
               ) THEN 'PASSED ✅'
               ELSE 'FAILED ❌ - Function not found'
           END as status
    UNION ALL
    SELECT 'RLS Enabled' as check_item,
           CASE
               WHEN (SELECT relrowsecurity FROM pg_class
                     WHERE relname = 'report_queue' AND relnamespace = 'public'::regnamespace)
               THEN 'PASSED ✅'
               ELSE 'FAILED ❌ - RLS not enabled'
           END as status
    UNION ALL
    SELECT 'Auth User Context' as check_item,
           CASE
               WHEN auth.uid() IS NOT NULL
               THEN 'PASSED ✅'
               ELSE 'WARNING ⚠️ - No authenticated user in this session'
           END as status
)
SELECT
    check_item as "Diagnostic Check",
    status as "Result"
FROM diagnostics
ORDER BY
    CASE
        WHEN status LIKE 'FAILED%' THEN 1
        WHEN status LIKE 'WARNING%' THEN 2
        ELSE 3
    END;

-- ========================================
-- SECTION 9: RECOMMENDED ACTIONS
-- ========================================
\echo '';
\echo '========================================';
\echo 'SECTION 9: RECOMMENDED ACTIONS';
\echo '========================================';
\echo '';
\echo 'Based on the diagnostics above:';
\echo '';
\echo '1. If Migration 0031 is missing:';
\echo '   - Run the migration manually in Supabase SQL Editor';
\echo '   - Check packages/database/migrations/0031_*.sql';
\echo '';
\echo '2. If multiple DELETE policies exist:';
\echo '   - Drop conflicting policies';
\echo '   - Ensure only one DELETE policy remains';
\echo '';
\echo '3. If no DELETE policy exists:';
\echo '   - The migration may have failed';
\echo '   - Manually create the DELETE policy';
\echo '';
\echo '4. To manually fix DELETE policy (if needed):';
\echo '';
\echo '-- Drop all DELETE policies first';
\echo 'DROP POLICY IF EXISTS "Users can delete their own reports" ON report_queue;';
\echo 'DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;';
\echo 'DROP POLICY IF EXISTS "Enable delete for users based on organization_id" ON report_queue;';
\echo '';
\echo '-- Create the correct DELETE policy';
\echo 'CREATE POLICY "Users can delete their own reports" ON report_queue';
\echo 'FOR DELETE TO authenticated';
\echo 'USING (';
\echo '    created_by = auth.uid()';
\echo '    AND organization_id = current_org_id()';
\echo ');';
\echo '';
\echo '========================================';
\echo 'END OF DIAGNOSTIC REPORT';
\echo '========================================';

-- Reset quiet mode
\set QUIET 0