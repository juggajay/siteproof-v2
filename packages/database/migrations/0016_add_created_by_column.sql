-- Add created_by column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);