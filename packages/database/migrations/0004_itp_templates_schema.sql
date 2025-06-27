-- ITP (Inspection Test Plan) Templates
CREATE TABLE itp_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Template info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- e.g., 'Construction', 'Software', 'Manufacturing'
  
  -- Template structure stored as JSONB for flexibility
  structure JSONB NOT NULL DEFAULT '[]',
  /* 
    Structure example:
    [
      {
        "id": "unique-id",
        "type": "section",
        "title": "Foundation Work",
        "order": 0,
        "items": [
          {
            "id": "unique-id-2",
            "type": "checkpoint",
            "title": "Excavation completed",
            "description": "Verify excavation depth and dimensions",
            "order": 0,
            "required": true,
            "fields": [
              {
                "id": "field-1",
                "type": "text",
                "label": "Depth (meters)",
                "required": true,
                "validation": { "min": 0, "max": 10 }
              },
              {
                "id": "field-2",
                "type": "checkbox",
                "label": "Soil condition verified",
                "required": true
              },
              {
                "id": "field-3",
                "type": "select",
                "label": "Weather conditions",
                "options": ["Dry", "Wet", "Frozen"],
                "required": false
              },
              {
                "id": "field-4",
                "type": "date",
                "label": "Inspection date",
                "required": true
              },
              {
                "id": "field-5",
                "type": "signature",
                "label": "Inspector signature",
                "required": true
              },
              {
                "id": "field-6",
                "type": "photo",
                "label": "Site photos",
                "required": false,
                "multiple": true
              }
            ]
          }
        ]
      }
    ]
  */
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Timestamps
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_itp_templates_org_id ON itp_templates(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_itp_templates_category ON itp_templates(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_itp_templates_is_active ON itp_templates(is_active) WHERE deleted_at IS NULL;

-- GIN index for JSONB searches
CREATE INDEX idx_itp_templates_structure ON itp_templates USING GIN (structure);

-- ITP Instances (filled out templates)
CREATE TABLE itp_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES itp_templates(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
  
  -- Instance data
  name VARCHAR(255) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}', -- Filled form data
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, in_progress, completed, approved
  completion_percentage INTEGER DEFAULT 0,
  
  -- Completion tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for instances
CREATE INDEX idx_itp_instances_template_id ON itp_instances(template_id);
CREATE INDEX idx_itp_instances_project_id ON itp_instances(project_id);
CREATE INDEX idx_itp_instances_lot_id ON itp_instances(lot_id);
CREATE INDEX idx_itp_instances_status ON itp_instances(status);
CREATE INDEX idx_itp_instances_data ON itp_instances USING GIN (data);

-- Update triggers
CREATE TRIGGER update_itp_templates_updated_at BEFORE UPDATE ON itp_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itp_instances_updated_at BEFORE UPDATE ON itp_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to validate template structure
CREATE OR REPLACE FUNCTION validate_template_structure(structure JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  item JSONB;
  field JSONB;
BEGIN
  -- Check if structure is an array
  IF jsonb_typeof(structure) != 'array' THEN
    RETURN FALSE;
  END IF;
  
  -- Validate each section
  FOR item IN SELECT * FROM jsonb_array_elements(structure)
  LOOP
    -- Check required fields
    IF NOT (item ? 'id' AND item ? 'type' AND item ? 'title' AND item ? 'order') THEN
      RETURN FALSE;
    END IF;
    
    -- If section, check items array
    IF item->>'type' = 'section' THEN
      IF NOT (item ? 'items' AND jsonb_typeof(item->'items') = 'array') THEN
        RETURN FALSE;
      END IF;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate structure
ALTER TABLE itp_templates
  ADD CONSTRAINT valid_template_structure
  CHECK (validate_template_structure(structure));

-- RLS Policies for templates
ALTER TABLE itp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates in their organizations"
  ON itp_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = itp_templates.organization_id
      AND organization_members.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins and owners can create templates"
  ON itp_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = itp_templates.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Template creators and admins can update"
  ON itp_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = itp_templates.organization_id
      AND om.user_id = auth.uid()
      AND (
        itp_templates.created_by = auth.uid()
        OR om.role IN ('owner', 'admin')
      )
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Template creators and admins can delete"
  ON itp_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = itp_templates.organization_id
      AND om.user_id = auth.uid()
      AND (
        itp_templates.created_by = auth.uid()
        OR om.role IN ('owner', 'admin')
      )
    )
  );

-- RLS Policies for instances
ALTER TABLE itp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view instances in their projects"
  ON itp_instances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = itp_instances.project_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create instances in their projects"
  ON itp_instances FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = itp_instances.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Instance creators and admins can update"
  ON itp_instances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = itp_instances.project_id
      AND om.user_id = auth.uid()
      AND (
        itp_instances.created_by = auth.uid()
        OR om.role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Instance creators and admins can delete"
  ON itp_instances FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = itp_instances.project_id
      AND om.user_id = auth.uid()
      AND (
        itp_instances.created_by = auth.uid()
        OR om.role IN ('owner', 'admin')
      )
    )
  );