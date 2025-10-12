-- Add 'itp_report' to the report_type enum in Supabase
-- This needs to be run in the Supabase SQL Editor

-- First, check current enum values
-- SELECT enum_range(NULL::report_type);

-- Add the new enum value
ALTER TYPE report_type ADD VALUE 'itp_report';

-- Verify the addition
-- SELECT enum_range(NULL::report_type);