-- ========================================
-- TEST vs PRODUCTION ENVIRONMENT COMPARISON
-- ========================================
-- Run this SAME script in BOTH test and production environments
-- Then compare the outputs to identify differences
-- ========================================

-- Identify which environment this is running in
SELECT
    current_database() as database_name,
    current_setting('server_version') as postgres_version,
    CASE
        WHEN current_database() LIKE '%prod%' THEN 'PRODUCTION'
        WHEN current_database() LIKE '%test%' THEN 'TEST'
        WHEN current_database() LIKE '%staging%' THEN 'STAGING'
        ELSE 'UNKNOWN'
    END as environment,
    NOW() as report_timestamp;

-- ========================================
-- 1. MIGRATION STATUS
-- ========================================
\echo '';
\echo '=== MIGRATION STATUS ===';
SELECT
    'Latest Migration' as metric,
    MAX(name) as value
FROM supabase_migrations.schema_migrations;

SELECT
    'Migration 0031 Applied' as metric,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM supabase_migrations.schema_migrations
            WHERE name LIKE '%0031%'
        ) THEN 'YES - Applied on: ' || MAX(executed_at)::text
        ELSE 'NO - NOT APPLIED'
    END as value
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%0031%';

SELECT
    'Total Migrations' as metric,
    COUNT(*)::text as value
FROM supabase_migrations.schema_migrations;

-- ========================================
-- 2. RLS POLICY COMPARISON
-- ========================================
\echo '';
\echo '=== RLS POLICIES ON report_queue ===';
SELECT
    cmd as command,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies
WHERE tablename = 'report_queue'
GROUP BY cmd
ORDER BY cmd;

-- Detailed DELETE policy info
\echo '';
\echo '=== DELETE POLICY DETAILS ===';
SELECT
    policyname,
    permissive,
    roles,
    LENGTH(qual::text) as using_clause_length,
    MD5(qual::text) as using_clause_hash
FROM pg_policies
WHERE tablename = 'report_queue'
    AND cmd = 'DELETE';

-- ========================================
-- 3. FUNCTION EXISTENCE
-- ========================================
\echo '';
\echo '=== HELPER FUNCTIONS ===';
SELECT
    proname as function_name,
    CASE WHEN prosrc IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES
    ('current_org_id'),
    ('current_user_role'),
    ('debug_report_delete_permission'),
    ('force_delete_report')
) AS funcs(proname)
LEFT JOIN pg_proc ON pg_proc.proname = funcs.proname
    AND pronamespace = 'public'::regnamespace;

-- ========================================
-- 4. TABLE STATISTICS
-- ========================================
\echo '';
\echo '=== TABLE STATISTICS ===';
SELECT
    'Total Reports' as metric,
    COUNT(*)::text as value
FROM report_queue
WHERE deleted_at IS NULL;

SELECT
    'Reports by Status' as metric,
    status || ': ' || COUNT(*)::text as value
FROM report_queue
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY status;

-- ========================================
-- 5. CURRENT USER CONTEXT
-- ========================================
\echo '';
\echo '=== USER CONTEXT ===';
SELECT
    'Current User ID' as context,
    COALESCE(auth.uid()::text, 'NO AUTH SESSION') as value
UNION ALL
SELECT
    'Current Org ID' as context,
    COALESCE(current_org_id()::text, 'NO ORG FOUND') as value
UNION ALL
SELECT
    'Current Role' as context,
    COALESCE(current_user_role()::text, 'NO ROLE FOUND') as value;

-- ========================================
-- 6. RLS CONFIGURATION
-- ========================================
\echo '';
\echo '=== RLS CONFIGURATION ===';
SELECT
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'report_queue'
    AND relnamespace = 'public'::regnamespace;

-- ========================================
-- 7. POLICY HASH COMPARISON
-- ========================================
\echo '';
\echo '=== POLICY SIGNATURES (for comparison) ===';
WITH policy_hashes AS (
    SELECT
        tablename,
        cmd,
        MD5(
            string_agg(
                policyname || '::' ||
                COALESCE(qual::text, 'NULL') || '::' ||
                COALESCE(with_check::text, 'NULL'),
                '||' ORDER BY policyname
            )
        ) as combined_hash
    FROM pg_policies
    WHERE tablename = 'report_queue'
    GROUP BY tablename, cmd
)
SELECT
    cmd as command,
    combined_hash as policy_signature
FROM policy_hashes
ORDER BY cmd;

-- ========================================
-- 8. PERMISSION TEST
-- ========================================
\echo '';
\echo '=== PERMISSION TEST (if authenticated) ===';
DO $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        RAISE NOTICE 'User authenticated - running permission tests';

        -- Test if user can see any reports
        IF EXISTS (SELECT 1 FROM report_queue LIMIT 1) THEN
            RAISE NOTICE 'SELECT permission: YES - Can see reports';
        ELSE
            RAISE NOTICE 'SELECT permission: NO - Cannot see reports (or no reports exist)';
        END IF;

        -- Test organization membership
        IF EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid()) THEN
            RAISE NOTICE 'Organization membership: YES - User is in an organization';
        ELSE
            RAISE NOTICE 'Organization membership: NO - User not in any organization';
        END IF;
    ELSE
        RAISE NOTICE 'No authenticated session - skipping permission tests';
    END IF;
END $$;

-- ========================================
-- 9. ENVIRONMENT FINGERPRINT
-- ========================================
\echo '';
\echo '=== ENVIRONMENT FINGERPRINT ===';
WITH env_data AS (
    SELECT
        (SELECT COUNT(*) FROM supabase_migrations.schema_migrations) as migration_count,
        (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'report_queue') as policy_count,
        (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'report_queue' AND cmd = 'DELETE') as delete_policy_count,
        (SELECT relrowsecurity FROM pg_class WHERE relname = 'report_queue' AND relnamespace = 'public'::regnamespace) as rls_enabled,
        (SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'debug_report_delete_permission' AND pronamespace = 'public'::regnamespace)) as has_debug_function
)
SELECT
    MD5(
        migration_count::text || '|' ||
        policy_count::text || '|' ||
        delete_policy_count::text || '|' ||
        rls_enabled::text || '|' ||
        has_debug_function::text
    ) as environment_fingerprint,
    migration_count,
    policy_count,
    delete_policy_count,
    rls_enabled,
    has_debug_function
FROM env_data;

-- ========================================
-- SUMMARY
-- ========================================
\echo '';
\echo '========================================';
\echo 'COMPARISON INSTRUCTIONS:';
\echo '1. Run this script in TEST environment';
\echo '2. Run this script in PRODUCTION environment';
\echo '3. Compare the outputs, especially:';
\echo '   - Migration 0031 status';
\echo '   - DELETE policy count and names';
\echo '   - Policy signatures (should match)';
\echo '   - Environment fingerprint';
\echo '========================================';