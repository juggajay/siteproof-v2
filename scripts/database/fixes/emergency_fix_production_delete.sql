-- ========================================
-- EMERGENCY FIX FOR PRODUCTION REPORT DELETION
-- ========================================
-- Run this if the diagnostic shows issues with DELETE policies
-- This script is IDEMPOTENT - safe to run multiple times
-- ========================================

BEGIN;  -- Start transaction for safety

-- ========================================
-- STEP 1: Check current state
-- ========================================
\echo 'Current DELETE policies:';
SELECT
    policyname,
    permissive,
    roles,
    qual::text as using_clause
FROM pg_policies
WHERE tablename = 'report_queue'
    AND cmd = 'DELETE';

-- ========================================
-- STEP 2: Clean up all DELETE policies
-- ========================================
\echo '';
\echo 'Dropping all existing DELETE policies...';

-- Use dynamic SQL to drop all DELETE policies
DO $$
DECLARE
    policy_rec RECORD;
    dropped_count INTEGER := 0;
BEGIN
    FOR policy_rec IN
        SELECT polname
        FROM pg_policy
        WHERE polrelid = 'report_queue'::regclass
          AND polcmd = 'd'  -- 'd' is DELETE
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON report_queue', policy_rec.polname);
        dropped_count := dropped_count + 1;
        RAISE NOTICE 'Dropped policy: %', policy_rec.polname;
    END LOOP;

    IF dropped_count = 0 THEN
        RAISE NOTICE 'No DELETE policies found to drop';
    ELSE
        RAISE NOTICE 'Dropped % DELETE policies total', dropped_count;
    END IF;
END $$;

-- ========================================
-- STEP 3: Create the correct DELETE policy
-- ========================================
\echo '';
\echo 'Creating correct DELETE policy...';

-- This is the SIMPLEST and MOST PERMISSIVE policy
-- Users can delete reports they created
CREATE POLICY "Users can delete their own reports"
ON report_queue
FOR DELETE
TO authenticated
USING (
    requested_by = auth.uid()  -- User created the report
    OR
    created_by = auth.uid()     -- Alternative column if used
);

-- Add comment for documentation
COMMENT ON POLICY "Users can delete their own reports" ON report_queue IS
'Simple policy: Users can only delete reports they created. Applied by emergency fix script.';

-- ========================================
-- STEP 4: Verify the fix
-- ========================================
\echo '';
\echo 'Verification:';

-- Count DELETE policies (should be 1)
SELECT
    'DELETE Policy Count' as check_item,
    COUNT(*) as count,
    CASE
        WHEN COUNT(*) = 1 THEN '✅ CORRECT - Single policy'
        WHEN COUNT(*) = 0 THEN '❌ ERROR - No policy created!'
        ELSE '⚠️ WARNING - Multiple policies!'
    END as status
FROM pg_policies
WHERE tablename = 'report_queue'
    AND cmd = 'DELETE';

-- Show the new policy
\echo '';
\echo 'New DELETE policy details:';
SELECT
    policyname,
    permissive,
    roles,
    qual::text as using_clause
FROM pg_policies
WHERE tablename = 'report_queue'
    AND cmd = 'DELETE';

-- ========================================
-- STEP 5: Test with current user
-- ========================================
\echo '';
\echo 'Testing with current user:';

-- Check if user can see their own reports
SELECT
    'Reports visible to current user' as test,
    COUNT(*) as count,
    string_agg(id::text, ', ' ORDER BY created_at DESC LIMIT 3) as sample_ids
FROM report_queue
WHERE requested_by = auth.uid()
    OR created_by = auth.uid();

-- ========================================
-- ROLLBACK OR COMMIT
-- ========================================
\echo '';
\echo '========================================';
\echo 'IMPORTANT: Review the output above!';
\echo '';
\echo 'If everything looks good:';
\echo '  Type: COMMIT;';
\echo '';
\echo 'If there are issues:';
\echo '  Type: ROLLBACK;';
\echo '========================================';

-- Transaction remains open for manual COMMIT or ROLLBACK

-- ========================================
-- ALTERNATIVE: More permissive policy
-- ========================================
/*
If you need organization-wide deletion (any org member can delete):

DROP POLICY IF EXISTS "Users can delete their own reports" ON report_queue;

CREATE POLICY "Organization members can delete reports"
ON report_queue
FOR DELETE
TO authenticated
USING (
    requested_by = auth.uid()
    OR
    created_by = auth.uid()
    OR
    organization_id IN (
        SELECT organization_id
        FROM organization_members
        WHERE user_id = auth.uid()
    )
);
*/

-- ========================================
-- ALTERNATIVE: Use debug function
-- ========================================
/*
If the simple policy doesn't work, use the debug function from migration 0031:

SELECT * FROM debug_report_delete_permission(
    '59e12281-a1b2-4202-b026-eddf8d9cdb30'::uuid  -- Replace with actual report ID
);

This will show exactly why a deletion is being blocked.
*/

-- ========================================
-- NUCLEAR OPTION: Temporarily disable RLS
-- ========================================
/*
EXTREME CAUTION - Only for emergency debugging:

ALTER TABLE report_queue DISABLE ROW LEVEL SECURITY;
-- Test deletion
ALTER TABLE report_queue ENABLE ROW LEVEL SECURITY;

DO NOT leave RLS disabled in production!
*/