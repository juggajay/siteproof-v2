-- Migration: Fix ITP instances columns for consistency
-- This ensures all environments have the same columns

-- Add missing columns if they don't exist
ALTER TABLE itp_instances 
ADD COLUMN IF NOT EXISTS inspection_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE itp_instances 
ADD COLUMN IF NOT EXISTS inspection_date TIMESTAMPTZ;

ALTER TABLE itp_instances 
ADD COLUMN IF NOT EXISTS evidence_files JSONB DEFAULT '[]'::jsonb;

ALTER TABLE itp_instances 
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'synced';

ALTER TABLE itp_instances 
ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE itp_instances 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE itp_instances 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Update existing records to have inspection_status if they only have status
UPDATE itp_instances 
SET inspection_status = COALESCE(inspection_status, status, 'pending')
WHERE inspection_status IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_itp_instances_inspection_status 
ON itp_instances(inspection_status) 
WHERE deleted_at IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN itp_instances.inspection_status IS 'Current inspection status: pending, in_progress, completed, approved';
COMMENT ON COLUMN itp_instances.evidence_files IS 'Array of file URLs for evidence photos/documents';
COMMENT ON COLUMN itp_instances.sync_status IS 'Sync status for offline support: synced, pending, error';