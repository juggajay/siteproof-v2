-- Add hide_costs_from_foreman flag to projects table
-- This allows project managers to hide cost information from foreman view

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS hide_costs_from_foreman BOOLEAN DEFAULT false;

COMMENT ON COLUMN projects.hide_costs_from_foreman IS 'When true, cost information is hidden from foreman in daily diary';
