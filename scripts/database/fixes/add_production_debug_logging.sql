-- ========================================
-- PRODUCTION DEBUG LOGGING FOR REPORT DELETION
-- ========================================
-- This adds temporary logging to help diagnose deletion issues
-- Safe to run in production - creates audit trail
-- ========================================

-- ========================================
-- STEP 1: Create debug log table
-- ========================================
CREATE TABLE IF NOT EXISTS report_deletion_debug_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID,
    report_id UUID,
    action TEXT,
    success BOOLEAN,
    error_message TEXT,
    debug_data JSONB,
    client_ip INET,
    user_agent TEXT
);

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_deletion_debug_user_report
ON report_deletion_debug_log(user_id, report_id, created_at DESC);

-- Enable RLS but allow authenticated users to insert their own logs
ALTER TABLE report_deletion_debug_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own debug logs"
ON report_deletion_debug_log
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read their own debug logs"
ON report_deletion_debug_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ========================================
-- STEP 2: Create debug trigger function
-- ========================================
CREATE OR REPLACE FUNCTION log_report_deletion_attempt()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_user_role TEXT;
    v_is_owner BOOLEAN;
    v_is_org_member BOOLEAN;
    v_debug_data JSONB;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();
    v_org_id := current_org_id();
    v_user_role := current_user_role();

    -- Check ownership and membership
    v_is_owner := OLD.requested_by = v_user_id OR OLD.created_by = v_user_id;
    v_is_org_member := EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = OLD.organization_id
          AND user_id = v_user_id
    );

    -- Build debug data
    v_debug_data := jsonb_build_object(
        'report_name', OLD.report_name,
        'report_status', OLD.status,
        'report_org_id', OLD.organization_id,
        'report_requested_by', OLD.requested_by,
        'report_created_by', OLD.created_by,
        'user_org_id', v_org_id,
        'user_role', v_user_role,
        'is_owner', v_is_owner,
        'is_org_member', v_is_org_member,
        'deletion_timestamp', NOW(),
        'trigger_event', TG_OP
    );

    -- Log the attempt
    INSERT INTO report_deletion_debug_log (
        user_id,
        report_id,
        action,
        success,
        debug_data
    ) VALUES (
        v_user_id,
        OLD.id,
        'DELETE_ATTEMPT',
        TRUE,  -- If we got here, the DELETE was allowed
        v_debug_data
    );

    RETURN OLD;  -- Allow the deletion to proceed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 3: Attach trigger to report_queue
-- ========================================
DROP TRIGGER IF EXISTS log_deletion_trigger ON report_queue;

CREATE TRIGGER log_deletion_trigger
BEFORE DELETE ON report_queue
FOR EACH ROW
EXECUTE FUNCTION log_report_deletion_attempt();

-- ========================================
-- STEP 4: Create function to log failed attempts
-- ========================================
CREATE OR REPLACE FUNCTION log_failed_deletion(
    p_report_id UUID,
    p_error_message TEXT,
    p_additional_data JSONB DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_report RECORD;
    v_debug_data JSONB;
BEGIN
    -- Get report details if it exists
    SELECT * INTO v_report
    FROM report_queue
    WHERE id = p_report_id;

    -- Build debug data
    v_debug_data := jsonb_build_object(
        'report_exists', (v_report.id IS NOT NULL),
        'report_name', v_report.report_name,
        'report_status', v_report.status,
        'report_org_id', v_report.organization_id,
        'report_requested_by', v_report.requested_by,
        'current_user_id', auth.uid(),
        'current_org_id', current_org_id(),
        'current_role', current_user_role(),
        'error_message', p_error_message,
        'timestamp', NOW()
    );

    -- Merge additional data if provided
    IF p_additional_data IS NOT NULL THEN
        v_debug_data := v_debug_data || p_additional_data;
    END IF;

    -- Log the failed attempt
    INSERT INTO report_deletion_debug_log (
        user_id,
        report_id,
        action,
        success,
        error_message,
        debug_data
    ) VALUES (
        auth.uid(),
        p_report_id,
        'DELETE_FAILED',
        FALSE,
        p_error_message,
        v_debug_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 5: Create analysis view
-- ========================================
CREATE OR REPLACE VIEW report_deletion_analysis AS
SELECT
    l.created_at,
    l.user_id,
    u.email as user_email,
    l.report_id,
    l.action,
    l.success,
    l.error_message,
    l.debug_data->>'report_name' as report_name,
    l.debug_data->>'report_status' as report_status,
    l.debug_data->>'is_owner' as is_owner,
    l.debug_data->>'is_org_member' as is_org_member,
    l.debug_data->>'user_role' as user_role,
    l.debug_data
FROM report_deletion_debug_log l
LEFT JOIN auth.users u ON u.id = l.user_id
ORDER BY l.created_at DESC;

-- Grant access to authenticated users (filtered by RLS)
GRANT SELECT ON report_deletion_analysis TO authenticated;

-- ========================================
-- STEP 6: Helper queries for debugging
-- ========================================

-- View recent deletion attempts
CREATE OR REPLACE FUNCTION get_recent_deletion_attempts(
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    attempt_time TIMESTAMPTZ,
    user_email TEXT,
    report_name TEXT,
    success BOOLEAN,
    error_message TEXT,
    is_owner TEXT,
    is_org_member TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        created_at as attempt_time,
        debug_data->>'user_email' as user_email,
        debug_data->>'report_name' as report_name,
        success,
        error_message,
        debug_data->>'is_owner' as is_owner,
        debug_data->>'is_org_member' as is_org_member
    FROM report_deletion_debug_log
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- USAGE INSTRUCTIONS
-- ========================================
\echo '';
\echo '========================================';
\echo 'DEBUG LOGGING INSTALLED';
\echo '========================================';
\echo '';
\echo 'To view recent deletion attempts:';
\echo '  SELECT * FROM get_recent_deletion_attempts();';
\echo '';
\echo 'To view all debug logs for current user:';
\echo '  SELECT * FROM report_deletion_analysis;';
\echo '';
\echo 'To manually log a failed deletion (from application):';
\echo '  SELECT log_failed_deletion(''report-id''::uuid, ''Error message'');';
\echo '';
\echo 'To check specific report deletion issues:';
\echo '  SELECT * FROM report_deletion_debug_log';
\echo '  WHERE report_id = ''your-report-id''::uuid';
\echo '  ORDER BY created_at DESC;';
\echo '';
\echo 'To remove debug logging later:';
\echo '  DROP TRIGGER log_deletion_trigger ON report_queue;';
\echo '  DROP TABLE report_deletion_debug_log CASCADE;';
\echo '========================================';

-- ========================================
-- STEP 7: Test the logging
-- ========================================
\echo '';
\echo 'Testing debug log insertion:';
DO $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        -- Try to insert a test log
        INSERT INTO report_deletion_debug_log (
            user_id,
            report_id,
            action,
            success,
            debug_data
        ) VALUES (
            auth.uid(),
            gen_random_uuid(),
            'TEST_LOG',
            TRUE,
            jsonb_build_object('test', TRUE, 'timestamp', NOW())
        );
        RAISE NOTICE 'Debug logging is working!';
    ELSE
        RAISE NOTICE 'No auth session - cannot test logging';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Debug logging test failed: %', SQLERRM;
END $$;