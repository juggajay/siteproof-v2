-- ========================================
-- SAFE MIGRATION: Only adds NEW tables
-- Run this in Supabase SQL Editor
-- ========================================

-- Step 1: Check what tables we need to create
DO $$
BEGIN
  RAISE NOTICE '=== Checking existing tables ===';

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contractors') THEN
    RAISE NOTICE 'contractors table EXISTS - skipping';
  ELSE
    RAISE NOTICE 'contractors table MISSING - will create';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workers') THEN
    RAISE NOTICE 'workers table EXISTS - skipping';
  ELSE
    RAISE NOTICE 'workers table MISSING - will create';
  END IF;
END $$;

-- Step 2: Create contractors table (if not exists)
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('labor', 'plant')),
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create workers table (if not exists)
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  certifications TEXT[],
  contact_phone TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create plant_items table (if not exists)
CREATE TABLE IF NOT EXISTS plant_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create material_suppliers table (if not exists)
CREATE TABLE IF NOT EXISTS material_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create materials table (if not exists)
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES material_suppliers(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT,
  is_preloaded BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Add foreman_id to projects table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'foreman_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN foreman_id UUID REFERENCES users(id);
    RAISE NOTICE 'Added foreman_id column to projects';
  ELSE
    RAISE NOTICE 'foreman_id column already exists in projects';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'hide_costs_from_foreman'
  ) THEN
    ALTER TABLE projects ADD COLUMN hide_costs_from_foreman BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added hide_costs_from_foreman column to projects';
  ELSE
    RAISE NOTICE 'hide_costs_from_foreman column already exists in projects';
  END IF;
END $$;

-- Step 8: Create diary_labor table (if not exists)
CREATE TABLE IF NOT EXISTS diary_labor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES daily_diaries(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id),
  hours_worked DECIMAL(5,2) NOT NULL CHECK (hours_worked >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 9: Create diary_plant table (if not exists)
CREATE TABLE IF NOT EXISTS diary_plant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES daily_diaries(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plant_items(id),
  hours_used DECIMAL(5,2) NOT NULL CHECK (hours_used >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 10: Create diary_materials table (if not exists)
CREATE TABLE IF NOT EXISTS diary_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES daily_diaries(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id),
  material_name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT,
  supplier_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 11: Create indexes
CREATE INDEX IF NOT EXISTS idx_contractors_org ON contractors(organization_id);
CREATE INDEX IF NOT EXISTS idx_contractors_type ON contractors(type);
CREATE INDEX IF NOT EXISTS idx_workers_contractor ON workers(contractor_id);
CREATE INDEX IF NOT EXISTS idx_workers_org ON workers(organization_id);
CREATE INDEX IF NOT EXISTS idx_plant_contractor ON plant_items(contractor_id);
CREATE INDEX IF NOT EXISTS idx_plant_org ON plant_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_materials_org ON materials(organization_id);
CREATE INDEX IF NOT EXISTS idx_material_suppliers_org ON material_suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_foreman ON projects(foreman_id);
CREATE INDEX IF NOT EXISTS idx_diary_labor_diary ON diary_labor(diary_id);
CREATE INDEX IF NOT EXISTS idx_diary_labor_worker ON diary_labor(worker_id);
CREATE INDEX IF NOT EXISTS idx_diary_plant_diary ON diary_plant(diary_id);
CREATE INDEX IF NOT EXISTS idx_diary_plant_plant ON diary_plant(plant_id);
CREATE INDEX IF NOT EXISTS idx_diary_materials_diary ON diary_materials(diary_id);
CREATE INDEX IF NOT EXISTS idx_diary_materials_material ON diary_materials(material_id);

-- Step 12: Enable Row Level Security
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_plant ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_materials ENABLE ROW LEVEL SECURITY;

-- Step 13: Create RLS Policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "org_contractors" ON contractors;
DROP POLICY IF EXISTS "org_workers" ON workers;
DROP POLICY IF EXISTS "org_plant" ON plant_items;
DROP POLICY IF EXISTS "org_materials" ON materials;
DROP POLICY IF EXISTS "org_suppliers" ON material_suppliers;
DROP POLICY IF EXISTS "diary_labor_policy" ON diary_labor;
DROP POLICY IF EXISTS "diary_plant_policy" ON diary_plant;
DROP POLICY IF EXISTS "diary_materials_policy" ON diary_materials;

CREATE POLICY "org_contractors" ON contractors FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "org_workers" ON workers FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "org_plant" ON plant_items FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "org_materials" ON materials FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "org_suppliers" ON material_suppliers FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "diary_labor_policy" ON diary_labor FOR ALL
  USING (diary_id IN (
    SELECT id FROM daily_diaries WHERE project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "diary_plant_policy" ON diary_plant FOR ALL
  USING (diary_id IN (
    SELECT id FROM daily_diaries WHERE project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "diary_materials_policy" ON diary_materials FOR ALL
  USING (diary_id IN (
    SELECT id FROM daily_diaries WHERE project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  ));

-- Step 14: Create update trigger for contractors
DROP TRIGGER IF EXISTS update_contractors_updated_at ON contractors;
CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON contractors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 15: Final verification
DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE 'Run this query to verify all tables exist:';
  RAISE NOTICE 'SELECT table_name FROM information_schema.tables WHERE table_name IN (''contractors'', ''workers'', ''plant_items'', ''materials'', ''diary_labor'', ''diary_plant'', ''diary_materials'') ORDER BY table_name;';
END $$;
