-- Add missing fields to diary_labour_entries table
ALTER TABLE diary_labour_entries 
ADD COLUMN IF NOT EXISTS worker_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company VARCHAR(255),
ADD COLUMN IF NOT EXISTS workers INTEGER DEFAULT 1;

-- Add missing fields to diary_plant_entries table  
ALTER TABLE diary_plant_entries
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS type VARCHAR(100),
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS hours_used DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing fields to diary_material_entries table
ALTER TABLE diary_material_entries
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS quantity DECIMAL(10, 3),
ADD COLUMN IF NOT EXISTS unit VARCHAR(50),
ADD COLUMN IF NOT EXISTS supplier VARCHAR(255),
ADD COLUMN IF NOT EXISTS notes TEXT;