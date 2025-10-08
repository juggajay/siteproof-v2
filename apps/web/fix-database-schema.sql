-- Complete database schema fixes for daily diary reports
-- Run this in Supabase SQL Editor

-- 1. Add 'daily_diary_entry' to report_type enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'daily_diary_entry'
        AND enumtypid = 'report_type'::regtype
    ) THEN
        ALTER TYPE report_type ADD VALUE 'daily_diary_entry';
    END IF;
END $$;

-- 2. Add notes_for_tomorrow column to daily_diaries table
ALTER TABLE daily_diaries
ADD COLUMN IF NOT EXISTS notes_for_tomorrow TEXT;

-- 3. Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the changes
SELECT
    'report_type enum values:' as info,
    enumlabel
FROM pg_enum
WHERE enumtypid = 'report_type'::regtype
ORDER BY enumsortorder;

SELECT
    'daily_diaries columns:' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'daily_diaries'
AND column_name = 'notes_for_tomorrow';
