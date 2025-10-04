-- Add missing notes columns to daily_diaries table
ALTER TABLE daily_diaries
ADD COLUMN IF NOT EXISTS weather_notes TEXT,
ADD COLUMN IF NOT EXISTS progress_notes TEXT;
