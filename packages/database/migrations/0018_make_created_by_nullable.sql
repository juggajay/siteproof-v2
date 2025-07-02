-- Make created_by column nullable to avoid foreign key constraint issues
ALTER TABLE organizations 
ALTER COLUMN created_by DROP NOT NULL;