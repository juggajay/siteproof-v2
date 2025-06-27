-- Daily Diaries for site activity tracking
CREATE TABLE daily_diaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Date and identification
  diary_date DATE NOT NULL,
  diary_number VARCHAR(50) NOT NULL, -- e.g., DD-2024-001
  
  -- Weather data (auto-populated)
  weather JSONB DEFAULT '{}',
  -- Structure: {
  --   temperature: { min: 15, max: 25, unit: 'C' },
  --   conditions: 'Partly Cloudy',
  --   description: 'Partly cloudy with light winds',
  --   humidity: 65,
  --   wind: { speed: 12, direction: 'NW', unit: 'km/h' },
  --   precipitation: { amount: 0, probability: 10 },
  --   uv_index: 6,
  --   sunrise: '06:30',
  --   sunset: '18:45',
  --   fetched_at: '2024-01-15T08:00:00Z',
  --   source: 'OpenWeatherMap'
  -- }
  
  -- Site conditions
  site_conditions TEXT,
  work_areas TEXT[],
  access_issues TEXT,
  
  -- Work performed
  work_summary TEXT NOT NULL,
  trades_on_site JSONB DEFAULT '[]',
  -- Structure: [{
  --   trade: 'Concrete',
  --   company: 'ABC Concrete Ltd',
  --   workers: 12,
  --   activities: ['Foundation pour - Block A', 'Slab preparation - Block B']
  -- }]
  
  -- Personnel
  total_workers INTEGER DEFAULT 0,
  key_personnel JSONB DEFAULT '[]',
  -- Structure: [{
  --   name: 'John Smith',
  --   role: 'Site Foreman',
  --   company: 'Main Contractor',
  --   hours: { start: '07:00', end: '17:00' }
  -- }]
  
  -- Equipment and materials
  equipment_on_site JSONB DEFAULT '[]',
  -- Structure: [{
  --   type: 'Crane',
  --   description: '50-ton mobile crane',
  --   supplier: 'XYZ Equipment',
  --   hours_used: 8
  -- }]
  
  material_deliveries JSONB DEFAULT '[]',
  -- Structure: [{
  --   material: 'Concrete',
  --   quantity: '50m³',
  --   supplier: 'Ready Mix Co',
  --   time: '09:30',
  --   location: 'Block A'
  -- }]
  
  -- Issues and delays
  delays JSONB DEFAULT '[]',
  -- Structure: [{
  --   type: 'Weather', // Weather, Equipment, Material, Labor, Other
  --   description: 'Rain stopped concrete pour',
  --   duration_hours: 2,
  --   impact: 'Medium'
  -- }]
  
  safety_incidents JSONB DEFAULT '[]',
  -- Structure: [{
  --   type: 'Near Miss', // Near Miss, Minor Injury, Major Injury
  --   description: 'Slip hazard identified',
  --   action_taken: 'Area cordoned off and cleaned',
  --   reported_to: 'Safety Officer'
  -- }]
  
  -- Inspections and visitors
  inspections JSONB DEFAULT '[]',
  -- Structure: [{
  --   type: 'Safety', // Safety, Quality, Client, Authority
  --   inspector: 'Jane Doe',
  --   organization: 'Safety Dept',
  --   findings: 'All PPE being worn correctly',
  --   time: '14:00'
  -- }]
  
  visitors JSONB DEFAULT '[]',
  -- Structure: [{
  --   name: 'Client Representative',
  --   company: 'Client Corp',
  --   purpose: 'Progress review',
  --   time_in: '10:00',
  --   time_out: '11:30'
  -- }]
  
  -- Progress and milestones
  milestones_achieved TEXT[],
  progress_photos JSONB DEFAULT '[]',
  -- Structure: [{
  --   url: 'https://...',
  --   caption: 'Foundation complete - Block A',
  --   location: 'Block A - Grid 3-4',
  --   timestamp: '2024-01-15T10:30:00Z'
  -- }]
  
  -- Additional notes
  general_notes TEXT,
  tomorrow_planned_work TEXT,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one diary per project per day
  CONSTRAINT unique_diary_per_day UNIQUE(project_id, diary_date)
);

-- Diary templates for quick entry
CREATE TABLE diary_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Pre-filled fields
  default_trades JSONB DEFAULT '[]',
  default_equipment JSONB DEFAULT '[]',
  common_work_items TEXT[],
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Diary attachments
CREATE TABLE diary_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diary_id UUID NOT NULL REFERENCES daily_diaries(id) ON DELETE CASCADE,
  
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  
  category VARCHAR(50), -- photo, document, drawing, other
  description TEXT,
  
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Diary comments for collaboration
CREATE TABLE diary_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diary_id UUID NOT NULL REFERENCES daily_diaries(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  
  author_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  parent_comment_id UUID REFERENCES diary_comments(id),
  deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_diaries_project_id ON daily_diaries(project_id);
CREATE INDEX idx_diaries_diary_date ON daily_diaries(diary_date DESC);
CREATE INDEX idx_diaries_created_by ON daily_diaries(created_by);
CREATE INDEX idx_diaries_organization_id ON daily_diaries(organization_id);

CREATE INDEX idx_diary_attachments_diary_id ON diary_attachments(diary_id);
CREATE INDEX idx_diary_comments_diary_id ON diary_comments(diary_id);

-- Update triggers
CREATE TRIGGER update_diaries_updated_at BEFORE UPDATE ON daily_diaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diary_templates_updated_at BEFORE UPDATE ON diary_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diary_comments_updated_at BEFORE UPDATE ON diary_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate diary numbers
CREATE OR REPLACE FUNCTION generate_diary_number(p_project_id UUID, p_diary_date DATE)
RETURNS VARCHAR AS $$
DECLARE
  v_year VARCHAR(4);
  v_sequence INTEGER;
  v_diary_number VARCHAR(50);
  v_project_code VARCHAR(10);
BEGIN
  v_year := TO_CHAR(p_diary_date, 'YYYY');
  
  -- Get project code (first 3 letters of project name)
  SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'), 3)) INTO v_project_code
  FROM projects
  WHERE id = p_project_id;
  
  -- Get next sequence number for this project and year
  SELECT COUNT(*) + 1 INTO v_sequence
  FROM daily_diaries
  WHERE project_id = p_project_id
  AND EXTRACT(YEAR FROM diary_date) = EXTRACT(YEAR FROM p_diary_date);
  
  v_diary_number := v_project_code || '-DD-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
  
  RETURN v_diary_number;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE daily_diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_comments ENABLE ROW LEVEL SECURITY;

-- Diary policies
CREATE POLICY "Users can view diaries in their organization"
  ON daily_diaries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = daily_diaries.project_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create diaries in their projects"
  ON daily_diaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = daily_diaries.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can update diaries they created"
  ON daily_diaries FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = daily_diaries.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Template policies
CREATE POLICY "Users can view templates in their organization"
  ON diary_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = diary_templates.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage templates"
  ON diary_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = diary_templates.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Attachment policies
CREATE POLICY "Users can view attachments for accessible diaries"
  ON diary_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_diaries d
      JOIN projects p ON p.id = d.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE d.id = diary_attachments.diary_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload attachments to diaries"
  ON diary_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_diaries d
      JOIN projects p ON p.id = d.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE d.id = diary_attachments.diary_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
    )
  );

-- Comment policies
CREATE POLICY "Users can view comments on accessible diaries"
  ON diary_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_diaries d
      JOIN projects p ON p.id = d.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE d.id = diary_comments.diary_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on diaries"
  ON diary_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM daily_diaries d
      JOIN projects p ON p.id = d.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE d.id = diary_comments.diary_id
      AND om.user_id = auth.uid()
    )
  );