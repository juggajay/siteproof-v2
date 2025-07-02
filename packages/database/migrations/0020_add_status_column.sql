-- Add status column to organization_members table
ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Add check constraint to ensure valid status values
ALTER TABLE organization_members 
ADD CONSTRAINT organization_members_status_check 
CHECK (status IN ('active', 'inactive', 'pending'));