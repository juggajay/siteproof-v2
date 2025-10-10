-- Part B: Helper functions only (no policies, no views)
-- This migration creates ONLY the helper functions

-- First, let's check if auth schema exists and create extension if needed
-- This ensures auth.uid() is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS can_delete_report(UUID);
DROP FUNCTION IF EXISTS can_delete_report(UUID, UUID);

-- Create helper function for debugging DELETE permissions
-- Version 1: Uses auth.uid() for current user
CREATE OR REPLACE FUNCTION can_delete_report(p_report_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_report RECORD;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  -- Handle potential null from auth.uid()
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    -- If auth.uid() fails, return false
    RETURN FALSE;
  END;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get report details
  SELECT
    requested_by,
    organization_id
  INTO v_report
  FROM report_queue
  WHERE id = p_report_id;

  -- If report doesn't exist, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if user requested the report
  IF v_report.requested_by = v_user_id THEN
    RETURN TRUE;
  END IF;

  -- Check if user is an admin/owner/project_manager in the organization
  -- Using EXISTS for better performance
  IF EXISTS (
    SELECT 1
    FROM organization_members
    WHERE user_id = v_user_id
      AND organization_id = v_report.organization_id
      AND role IN ('owner', 'admin', 'project_manager')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Version 2: Explicit user_id parameter for testing
CREATE OR REPLACE FUNCTION can_delete_report(p_report_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_report RECORD;
BEGIN
  -- Validate inputs
  IF p_report_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get report details
  SELECT
    requested_by,
    organization_id
  INTO v_report
  FROM report_queue
  WHERE id = p_report_id;

  -- If report doesn't exist, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if user requested the report
  IF v_report.requested_by = p_user_id THEN
    RETURN TRUE;
  END IF;

  -- Check if user is an admin/owner/project_manager in the organization
  -- Using EXISTS for better performance
  IF EXISTS (
    SELECT 1
    FROM organization_members
    WHERE user_id = p_user_id
      AND organization_id = v_report.organization_id
      AND role IN ('owner', 'admin', 'project_manager')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION can_delete_report(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_report(UUID, UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION can_delete_report(UUID) IS
'Helper function to check if the current user has permission to delete a report. Returns TRUE if user can delete, FALSE otherwise.';

COMMENT ON FUNCTION can_delete_report(UUID, UUID) IS
'Helper function to check if a specific user has permission to delete a report. For testing and debugging purposes.';

-- Test the functions (as comments showing how to test):
-- SELECT can_delete_report('some-report-uuid');
-- SELECT can_delete_report('some-report-uuid', 'some-user-uuid');