-- Add description column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS description TEXT;