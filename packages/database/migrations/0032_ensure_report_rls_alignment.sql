-- ============================================
-- Migration 0032: Ensure Report Queue RLS Alignment
-- ============================================
-- Purpose: Guarantee SELECT and DELETE policies are aligned
-- Issue: Multiple migrations created conflicting policies causing users to
--        see reports they cannot delete
-- Solution: Clean slate approach with perfectly aligned policies

BEGIN;

-- ============================================
-- STEP 1: Drop ALL existing policies on report_queue
-- ============================================
DO $$
DECLARE
  policy_rec RECORD;
BEGIN
  -- Drop all policies on report_queue table
  FOR policy_rec IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'report_queue'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON report_queue', policy_rec.polname);
    RAISE NOTICE 'Dropped policy: %', policy_rec.polname;
  END LOOP;

  RAISE NOTICE 'All existing policies on report_queue have been dropped';
END $$;

-- ============================================
-- STEP 2: Create aligned SELECT policy
-- ============================================
CREATE POLICY "report_queue_select"
ON report_queue
FOR SELECT
TO authenticated
USING (
  -- User can see reports they requested OR from their organization(s)
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

COMMENT ON POLICY "report_queue_select" ON report_queue IS
'Users can view reports they requested or any report from their organization(s)';

-- ============================================
-- STEP 3: Create aligned DELETE policy (matches SELECT exactly)
-- ============================================
CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User can delete reports they requested OR from their organization(s)
  -- This exactly matches the SELECT policy for consistency
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

COMMENT ON POLICY "report_queue_delete" ON report_queue IS
'Users can delete reports they requested or any report from their organization(s) - aligned with SELECT policy';

-- ============================================
-- STEP 4: Create INSERT policy
-- ============================================
CREATE POLICY "report_queue_insert"
ON report_queue
FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can only create reports in their organization
  -- and requested_by must be themselves
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
  AND requested_by = auth.uid()
);

COMMENT ON POLICY "report_queue_insert" ON report_queue IS
'Users can create reports in their organization(s) with themselves as requester';

-- ============================================
-- STEP 5: Create UPDATE policy
-- ============================================
CREATE POLICY "report_queue_update"
ON report_queue
FOR UPDATE
TO authenticated
USING (
  -- Users can update reports they requested
  -- OR if they're admin/owner in the organization
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  -- Ensure organization doesn't change on update
  organization_id = (SELECT organization_id FROM report_queue WHERE id = report_queue.id)
);

COMMENT ON POLICY "report_queue_update" ON report_queue IS
'Users can update their own reports or any report if they are admin/owner';

-- ============================================
-- STEP 6: Create index to optimize policy checks
-- ============================================
-- These indexes help with the common policy lookups
CREATE INDEX IF NOT EXISTS idx_report_queue_requested_by
ON report_queue(requested_by);

CREATE INDEX IF NOT EXISTS idx_report_queue_org_id
ON report_queue(organization_id);

CREATE INDEX IF NOT EXISTS idx_org_members_user_org
ON organization_members(user_id, organization_id);

-- ============================================
-- STEP 7: Verify policies are correctly set
-- ============================================
DO $$
DECLARE
  select_count INTEGER;
  delete_count INTEGER;
  insert_count INTEGER;
  update_count INTEGER;
  total_count INTEGER;
  select_expr TEXT;
  delete_expr TEXT;
BEGIN
  -- Count policies by type
  SELECT COUNT(*) INTO select_count
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass AND polcmd = 'r';

  SELECT COUNT(*) INTO delete_count
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';

  SELECT COUNT(*) INTO insert_count
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass AND polcmd = 'a';

  SELECT COUNT(*) INTO update_count
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass AND polcmd = 'w';

  SELECT COUNT(*) INTO total_count
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass;

  -- Get the actual expressions
  SELECT pg_get_expr(polqual, polrelid) INTO select_expr
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass AND polcmd = 'r'
  LIMIT 1;

  SELECT pg_get_expr(polqual, polrelid) INTO delete_expr
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd'
  LIMIT 1;

  -- Verify counts
  IF select_count != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 SELECT policy, found %', select_count;
  END IF;

  IF delete_count != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 DELETE policy, found %', delete_count;
  END IF;

  IF insert_count != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 INSERT policy, found %', insert_count;
  END IF;

  IF update_count != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 UPDATE policy, found %', update_count;
  END IF;

  IF total_count != 4 THEN
    RAISE EXCEPTION 'Expected exactly 4 policies total, found %', total_count;
  END IF;

  -- Verify SELECT and DELETE are aligned
  IF select_expr != delete_expr THEN
    RAISE WARNING 'SELECT and DELETE policies have different expressions!';
    RAISE WARNING 'SELECT: %', select_expr;
    RAISE WARNING 'DELETE: %', delete_expr;
  ELSE
    RAISE NOTICE 'SUCCESS: SELECT and DELETE policies are perfectly aligned';
  END IF;

  RAISE NOTICE 'Policy verification complete:';
  RAISE NOTICE '  - SELECT policies: %', select_count;
  RAISE NOTICE '  - DELETE policies: %', delete_count;
  RAISE NOTICE '  - INSERT policies: %', insert_count;
  RAISE NOTICE '  - UPDATE policies: %', update_count;
  RAISE NOTICE '  - Total policies: %', total_count;
END $$;

-- ============================================
-- STEP 8: Create helper function for debugging
-- ============================================
CREATE OR REPLACE FUNCTION debug_report_access(
  p_user_id UUID DEFAULT NULL,
  p_report_id UUID DEFAULT NULL
)
RETURNS TABLE (
  check_type TEXT,
  check_detail TEXT,
  result BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_report RECORD;
  v_org_count INTEGER;
BEGIN
  -- Use provided user or current user
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 'ERROR'::TEXT, 'No user ID provided or authenticated'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Check user's organizations
  SELECT COUNT(DISTINCT organization_id) INTO v_org_count
  FROM organization_members
  WHERE user_id = v_user_id;

  RETURN QUERY SELECT
    'User Organizations'::TEXT,
    format('User belongs to %s organization(s)', v_org_count)::TEXT,
    v_org_count > 0;

  -- If report ID provided, check specific report access
  IF p_report_id IS NOT NULL THEN
    SELECT * INTO v_report
    FROM report_queue
    WHERE id = p_report_id;

    IF NOT FOUND THEN
      RETURN QUERY SELECT 'Report Exists'::TEXT, 'Report not found'::TEXT, FALSE;
      RETURN;
    END IF;

    -- Check if user owns the report
    RETURN QUERY SELECT
      'Owns Report'::TEXT,
      format('requested_by = %s', v_report.requested_by = v_user_id)::TEXT,
      v_report.requested_by = v_user_id;

    -- Check if user is in same organization
    RETURN QUERY SELECT
      'Same Organization'::TEXT,
      format('User in org %s: %s',
        v_report.organization_id,
        EXISTS(
          SELECT 1 FROM organization_members
          WHERE user_id = v_user_id
            AND organization_id = v_report.organization_id
        )
      )::TEXT,
      EXISTS(
        SELECT 1 FROM organization_members
        WHERE user_id = v_user_id
          AND organization_id = v_report.organization_id
      );

    -- Final verdict
    RETURN QUERY SELECT
      'CAN ACCESS'::TEXT,
      CASE
        WHEN v_report.requested_by = v_user_id THEN 'YES - Owner'
        WHEN EXISTS(
          SELECT 1 FROM organization_members
          WHERE user_id = v_user_id
            AND organization_id = v_report.organization_id
        ) THEN 'YES - Organization member'
        ELSE 'NO - No access'
      END::TEXT,
      (
        v_report.requested_by = v_user_id
        OR
        EXISTS(
          SELECT 1 FROM organization_members
          WHERE user_id = v_user_id
            AND organization_id = v_report.organization_id
        )
      );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION debug_report_access IS
'Debug function to check why a user can or cannot access a report. Usage: SELECT * FROM debug_report_access(user_id, report_id)';

-- ============================================
-- STEP 9: Display final policy configuration
-- ============================================
SELECT
  'FINAL POLICY CONFIGURATION' as info,
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END as operation
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY
  CASE polcmd
    WHEN 'r' THEN 1
    WHEN 'd' THEN 2
    WHEN 'a' THEN 3
    WHEN 'w' THEN 4
  END;

COMMIT;

-- ============================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================
/*
To rollback this migration:

BEGIN;

-- Drop new policies
DROP POLICY IF EXISTS "report_queue_select" ON report_queue;
DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;
DROP POLICY IF EXISTS "report_queue_insert" ON report_queue;
DROP POLICY IF EXISTS "report_queue_update" ON report_queue;

-- Drop helper function
DROP FUNCTION IF EXISTS debug_report_access(UUID, UUID);

-- Restore previous policies (from migration 0031)
-- ... (insert previous policy definitions here)

COMMIT;
*/