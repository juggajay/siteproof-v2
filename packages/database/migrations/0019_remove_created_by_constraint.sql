-- Remove the foreign key constraint on created_by
ALTER TABLE organizations 
DROP CONSTRAINT IF EXISTS organizations_created_by_fkey;

-- Optional: Add it back later without the constraint
-- This keeps the column but removes the foreign key requirement
ALTER TABLE organizations 
ALTER COLUMN created_by TYPE UUID USING created_by::UUID;