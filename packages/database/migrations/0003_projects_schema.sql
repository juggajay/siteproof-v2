-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Client info
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_phone VARCHAR(50),
  client_company VARCHAR(255),
  
  -- Project settings
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, completed, archived
  visibility VARCHAR(50) NOT NULL DEFAULT 'private', -- private, public, password
  password_hash TEXT, -- For password-protected projects
  
  -- Dates
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Create indexes for projects
CREATE INDEX idx_projects_org_id ON projects(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_due_date ON projects(due_date) WHERE deleted_at IS NULL;

-- Lots table (versions/iterations of proofs)
CREATE TABLE lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Lot info
  lot_number INTEGER NOT NULL,
  name VARCHAR(255),
  description TEXT,
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_review, approved, rejected
  
  -- Files and content
  files JSONB DEFAULT '[]', -- Array of file objects with url, name, size, type
  
  -- Review tracking
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  
  -- Feedback
  internal_notes TEXT,
  client_notes TEXT,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Version control
  version INTEGER NOT NULL DEFAULT 1,
  parent_lot_id UUID REFERENCES lots(id),
  
  -- Ensure unique lot numbers per project
  CONSTRAINT unique_lot_number_per_project UNIQUE(project_id, lot_number)
);

-- Create indexes for lots
CREATE INDEX idx_lots_project_id ON lots(project_id);
CREATE INDEX idx_lots_status ON lots(status);
CREATE INDEX idx_lots_created_at ON lots(created_at);
CREATE INDEX idx_lots_parent_lot_id ON lots(parent_lot_id);

-- Comments table for feedback on lots
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  
  -- Comment content
  content TEXT NOT NULL,
  
  -- For visual feedback (annotations)
  metadata JSONB DEFAULT '{}', -- Can store x, y coordinates, dimensions for annotations
  
  -- Threading
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Status
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  
  -- Author info
  author_id UUID REFERENCES users(id),
  author_name VARCHAR(255), -- For guest comments
  author_email VARCHAR(255), -- For guest comments
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Create indexes for comments
CREATE INDEX idx_comments_lot_id ON comments(lot_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_comments_resolved ON comments(resolved) WHERE deleted_at IS NULL;

-- Project access tokens for sharing
CREATE TABLE project_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  token VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Access control
  permissions JSONB DEFAULT '{"view": true, "comment": true}',
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  
  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  use_count INTEGER DEFAULT 0,
  
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Active flag
  is_active BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT unique_active_token_per_project UNIQUE(project_id, token) WHERE is_active = TRUE
);

-- Create indexes for access tokens
CREATE INDEX idx_project_access_tokens_token ON project_access_tokens(token) WHERE is_active = TRUE;
CREATE INDEX idx_project_access_tokens_project_id ON project_access_tokens(project_id) WHERE is_active = TRUE;

-- Materialized view for project dashboard stats
CREATE MATERIALIZED VIEW project_dashboard_stats AS
SELECT 
  p.organization_id,
  p.id as project_id,
  p.name as project_name,
  p.status as project_status,
  p.created_at as project_created_at,
  p.due_date,
  p.client_name,
  p.client_company,
  
  -- Lot statistics
  COUNT(DISTINCT l.id) as total_lots,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'pending') as pending_lots,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'in_review') as in_review_lots,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'approved') as approved_lots,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'rejected') as rejected_lots,
  
  -- Comment statistics
  COUNT(DISTINCT c.id) as total_comments,
  COUNT(DISTINCT c.id) FILTER (WHERE c.resolved = FALSE) as unresolved_comments,
  
  -- Latest activity
  GREATEST(
    MAX(l.created_at),
    MAX(l.updated_at),
    MAX(c.created_at)
  ) as last_activity_at,
  
  -- Progress calculation (percentage of approved lots)
  CASE 
    WHEN COUNT(DISTINCT l.id) > 0 
    THEN (COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'approved')::FLOAT / COUNT(DISTINCT l.id) * 100)::INTEGER
    ELSE 0
  END as progress_percentage
  
FROM projects p
LEFT JOIN lots l ON p.id = l.project_id
LEFT JOIN comments c ON l.id = c.lot_id AND c.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.organization_id, p.name, p.status, p.created_at, p.due_date, p.client_name, p.client_company;

-- Create indexes on the materialized view
CREATE INDEX idx_project_stats_org_id ON project_dashboard_stats(organization_id);
CREATE INDEX idx_project_stats_project_status ON project_dashboard_stats(project_status);
CREATE INDEX idx_project_stats_last_activity ON project_dashboard_stats(last_activity_at DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_project_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment lot numbers
CREATE OR REPLACE FUNCTION set_lot_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lot_number IS NULL THEN
    SELECT COALESCE(MAX(lot_number), 0) + 1
    INTO NEW.lot_number
    FROM lots
    WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_set_lot_number
  BEFORE INSERT ON lots
  FOR EACH ROW
  EXECUTE FUNCTION set_lot_number();

-- Update triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lots_updated_at BEFORE UPDATE ON lots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects in their organizations"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = projects.organization_id
      AND organization_members.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can create projects in their organizations"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = projects.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin', 'member')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own projects or admin/owner can update any"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = projects.organization_id
      AND om.user_id = auth.uid()
      AND (
        projects.created_by = auth.uid()
        OR om.role IN ('owner', 'admin')
      )
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can delete their own projects or admin/owner can delete any"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = projects.organization_id
      AND om.user_id = auth.uid()
      AND (
        projects.created_by = auth.uid()
        OR om.role IN ('owner', 'admin')
      )
    )
  );

-- RLS Policies for lots
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lots in their organization's projects"
  ON lots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = lots.project_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create lots in projects they have access to"
  ON lots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = lots.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update lots they created or admin/owner can update any"
  ON lots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = lots.project_id
      AND om.user_id = auth.uid()
      AND (
        lots.created_by = auth.uid()
        OR om.role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Users can delete lots they created or admin/owner can delete any"
  ON lots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = lots.project_id
      AND om.user_id = auth.uid()
      AND (
        lots.created_by = auth.uid()
        OR om.role IN ('owner', 'admin')
      )
    )
  );

-- RLS Policies for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments in their organization's projects"
  ON comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lots l
      JOIN projects p ON p.id = l.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE l.id = comments.lot_id
      AND om.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can create comments in accessible projects"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lots l
      JOIN projects p ON p.id = l.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE l.id = comments.lot_id
      AND om.user_id = auth.uid()
    )
    AND (author_id = auth.uid() OR author_id IS NULL)
  );

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own comments or admin/owner can delete any"
  ON comments FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM lots l
      JOIN projects p ON p.id = l.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE l.id = comments.lot_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for project access tokens
ALTER TABLE project_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tokens for projects they manage"
  ON project_access_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = project_access_tokens.project_id
      AND om.user_id = auth.uid()
      AND (
        p.created_by = auth.uid()
        OR om.role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Project creators and admins can manage tokens"
  ON project_access_tokens FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = project_access_tokens.project_id
      AND om.user_id = auth.uid()
      AND (
        p.created_by = auth.uid()
        OR om.role IN ('owner', 'admin')
      )
    )
  );