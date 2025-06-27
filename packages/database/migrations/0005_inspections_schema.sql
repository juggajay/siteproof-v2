-- ITP Assignments (assigning templates to users for specific projects/lots)
CREATE TABLE itp_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES itp_templates(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
  
  -- Assignment details
  assigned_to UUID NOT NULL REFERENCES users(id),
  assigned_by UUID NOT NULL REFERENCES users(id),
  
  -- Assignment metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high, urgent
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, overdue
  
  -- Timestamps
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Prevent duplicate assignments
  CONSTRAINT unique_assignment UNIQUE(template_id, project_id, lot_id, assigned_to)
);

-- Inspections (actual inspection records)
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES itp_assignments(id) ON DELETE SET NULL,
  template_id UUID NOT NULL REFERENCES itp_templates(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
  
  -- Inspector info
  inspector_id UUID NOT NULL REFERENCES users(id),
  
  -- Inspection data
  data JSONB NOT NULL DEFAULT '{}',
  
  -- Status and progress
  status VARCHAR(50) DEFAULT 'draft', -- draft, in_progress, submitted, approved, rejected
  completion_percentage INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  
  -- Review feedback
  review_notes TEXT,
  
  -- Offline sync metadata
  client_id VARCHAR(255), -- Unique ID from client for deduplication
  last_synced_at TIMESTAMPTZ,
  sync_version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inspection attachments (photos, signatures, etc.)
CREATE TABLE inspection_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  field_id VARCHAR(255) NOT NULL, -- Reference to field in template
  
  -- File info
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- Can store GPS coords, timestamp, etc.
  
  -- Upload tracking
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  
  -- Offline sync
  client_id VARCHAR(255),
  is_synced BOOLEAN DEFAULT TRUE
);

-- Sync conflicts table for offline resolution
CREATE TABLE sync_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  
  -- Conflict data
  server_data JSONB NOT NULL,
  client_data JSONB NOT NULL,
  
  -- Conflict metadata
  conflict_type VARCHAR(50) NOT NULL, -- data_mismatch, version_conflict, etc.
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution VARCHAR(50), -- server_wins, client_wins, merged
  merged_data JSONB
);

-- Create indexes
CREATE INDEX idx_assignments_assigned_to ON itp_assignments(assigned_to);
CREATE INDEX idx_assignments_project_id ON itp_assignments(project_id);
CREATE INDEX idx_assignments_status ON itp_assignments(status);
CREATE INDEX idx_assignments_due_date ON itp_assignments(due_date);

CREATE INDEX idx_inspections_assignment_id ON inspections(assignment_id);
CREATE INDEX idx_inspections_project_id ON inspections(project_id);
CREATE INDEX idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_client_id ON inspections(client_id);
CREATE INDEX idx_inspections_data ON inspections USING GIN (data);

CREATE INDEX idx_attachments_inspection_id ON inspection_attachments(inspection_id);
CREATE INDEX idx_attachments_field_id ON inspection_attachments(field_id);
CREATE INDEX idx_attachments_is_synced ON inspection_attachments(is_synced) WHERE NOT is_synced;

CREATE INDEX idx_conflicts_inspection_id ON sync_conflicts(inspection_id);
CREATE INDEX idx_conflicts_resolved ON sync_conflicts(resolved) WHERE NOT resolved;

-- Update triggers
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate inspection completion percentage
CREATE OR REPLACE FUNCTION calculate_inspection_completion(inspection_data JSONB, template_structure JSONB)
RETURNS INTEGER AS $$
DECLARE
  total_required INTEGER := 0;
  completed_required INTEGER := 0;
  field JSONB;
  field_value JSONB;
BEGIN
  -- Count required fields in template
  FOR field IN 
    SELECT jsonb_array_elements(jsonb_array_elements(template_structure)->'items')->'fields'
  LOOP
    IF (field->>'required')::BOOLEAN THEN
      total_required := total_required + 1;
      
      -- Check if field has value in inspection data
      field_value := inspection_data->>(field->>'id');
      IF field_value IS NOT NULL AND field_value != 'null' THEN
        completed_required := completed_required + 1;
      END IF;
    END IF;
  END LOOP;
  
  IF total_required = 0 THEN
    RETURN 100;
  END IF;
  
  RETURN (completed_required::FLOAT / total_required * 100)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Function to handle offline sync
CREATE OR REPLACE FUNCTION sync_inspection(
  p_client_id VARCHAR,
  p_inspection_data JSONB,
  p_sync_version INTEGER
)
RETURNS JSONB AS $$
DECLARE
  existing_inspection RECORD;
  result JSONB;
BEGIN
  -- Check for existing inspection
  SELECT * INTO existing_inspection
  FROM inspections
  WHERE client_id = p_client_id;
  
  IF NOT FOUND THEN
    -- New inspection, insert it
    INSERT INTO inspections (client_id, data, sync_version)
    VALUES (p_client_id, p_inspection_data, p_sync_version)
    RETURNING jsonb_build_object(
      'status', 'created',
      'inspection_id', id,
      'sync_version', sync_version
    ) INTO result;
  ELSE
    -- Check for conflicts
    IF existing_inspection.sync_version != p_sync_version - 1 THEN
      -- Version conflict detected
      INSERT INTO sync_conflicts (
        inspection_id,
        server_data,
        client_data,
        conflict_type
      ) VALUES (
        existing_inspection.id,
        existing_inspection.data,
        p_inspection_data,
        'version_conflict'
      );
      
      result := jsonb_build_object(
        'status', 'conflict',
        'inspection_id', existing_inspection.id,
        'server_version', existing_inspection.sync_version,
        'server_data', existing_inspection.data
      );
    ELSE
      -- No conflict, update
      UPDATE inspections
      SET 
        data = p_inspection_data,
        sync_version = p_sync_version,
        last_synced_at = NOW()
      WHERE id = existing_inspection.id;
      
      result := jsonb_build_object(
        'status', 'updated',
        'inspection_id', existing_inspection.id,
        'sync_version', p_sync_version
      );
    END IF;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE itp_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;

-- Assignment policies
CREATE POLICY "Users can view their assignments"
  ON itp_assignments FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = itp_assignments.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can create assignments"
  ON itp_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = itp_assignments.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
    )
  );

-- Inspection policies
CREATE POLICY "Users can view inspections in their projects"
  ON inspections FOR SELECT
  TO authenticated
  USING (
    inspector_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = inspections.project_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create and update their own inspections"
  ON inspections FOR ALL
  TO authenticated
  USING (inspector_id = auth.uid())
  WITH CHECK (inspector_id = auth.uid());

-- Attachment policies
CREATE POLICY "Users can manage attachments for their inspections"
  ON inspection_attachments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_attachments.inspection_id
      AND i.inspector_id = auth.uid()
    )
  );

-- Conflict policies
CREATE POLICY "Users can view and resolve conflicts for their inspections"
  ON sync_conflicts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = sync_conflicts.inspection_id
      AND i.inspector_id = auth.uid()
    )
  );