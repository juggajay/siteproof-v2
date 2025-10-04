-- Migration 0022: Extend Daily Diary for Foreman-First Flow
-- Add foreman assignment to projects and structured diary entries

-- Add foreman assignment to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS foreman_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_projects_foreman ON projects(foreman_id);

-- Add cost visibility toggle
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hide_costs_from_foreman BOOLEAN DEFAULT false;

-- Labor entries linked to workers
CREATE TABLE IF NOT EXISTS diary_labor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES daily_diaries(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id),
  hours_worked DECIMAL(5,2) NOT NULL CHECK (hours_worked >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plant/Equipment entries
CREATE TABLE IF NOT EXISTS diary_plant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES daily_diaries(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plant_items(id),
  hours_used DECIMAL(5,2) NOT NULL CHECK (hours_used >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materials entries (supports both pre-loaded and ad-hoc)
CREATE TABLE IF NOT EXISTS diary_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES daily_diaries(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id), -- nullable for ad-hoc
  material_name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT,
  supplier_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_diary_labor_diary ON diary_labor(diary_id);
CREATE INDEX IF NOT EXISTS idx_diary_labor_worker ON diary_labor(worker_id);
CREATE INDEX IF NOT EXISTS idx_diary_plant_diary ON diary_plant(diary_id);
CREATE INDEX IF NOT EXISTS idx_diary_plant_plant ON diary_plant(plant_id);
CREATE INDEX IF NOT EXISTS idx_diary_materials_diary ON diary_materials(diary_id);
CREATE INDEX IF NOT EXISTS idx_diary_materials_material ON diary_materials(material_id);

-- Row Level Security
ALTER TABLE diary_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_plant ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
