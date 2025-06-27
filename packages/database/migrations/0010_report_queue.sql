-- Report types enum
CREATE TYPE report_type AS ENUM (
  'project_summary',
  'daily_diary_export',
  'inspection_summary',
  'ncr_report',
  'financial_summary',
  'safety_report',
  'quality_report',
  'custom'
);

-- Report status enum
CREATE TYPE report_status AS ENUM (
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

-- Report format enum
CREATE TYPE report_format AS ENUM (
  'pdf',
  'excel',
  'csv',
  'json'
);

-- Report queue table
CREATE TABLE report_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Report details
  report_type report_type NOT NULL,
  report_name VARCHAR(255) NOT NULL,
  description TEXT,
  format report_format NOT NULL DEFAULT 'pdf',
  
  -- Parameters for the report
  parameters JSONB NOT NULL DEFAULT '{}',
  -- Examples:
  -- For project_summary: { project_id: 'uuid', date_range: { start: '2024-01-01', end: '2024-12-31' } }
  -- For daily_diary_export: { project_id: 'uuid', start_date: '2024-01-01', end_date: '2024-01-31' }
  -- For inspection_summary: { project_id: 'uuid', include_photos: true, group_by: 'template' }
  
  -- Status tracking
  status report_status NOT NULL DEFAULT 'queued',
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Progress tracking
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step TEXT,
  total_steps INTEGER,
  
  -- Result storage
  file_url TEXT,
  file_size_bytes BIGINT,
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  
  -- Error handling
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Job tracking
  trigger_job_id VARCHAR(255), -- Trigger.dev job ID
  
  -- User tracking
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- TTL for cleanup
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Report templates for common reports
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Template details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type report_type NOT NULL,
  
  -- Default parameters
  default_parameters JSONB DEFAULT '{}',
  
  -- Layout and styling
  template_config JSONB DEFAULT '{}',
  -- Structure: {
  --   header: { logo: true, company_info: true, date: true },
  --   sections: ['summary', 'details', 'charts', 'photos'],
  --   footer: { page_numbers: true, generated_date: true }
  -- }
  
  -- Permissions
  is_public BOOLEAN DEFAULT FALSE,
  allowed_roles TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_template_name_per_org UNIQUE(organization_id, name)
);

-- Scheduled reports
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Schedule details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  
  -- Schedule configuration
  schedule_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly, custom
  schedule_config JSONB NOT NULL,
  -- Examples:
  -- Daily: { time: '08:00' }
  -- Weekly: { day: 'monday', time: '08:00' }
  -- Monthly: { day: 1, time: '08:00' } or { day: 'last', time: '08:00' }
  -- Custom: { cron: '0 8 * * 1' }
  
  -- Report configuration
  report_type report_type NOT NULL,
  format report_format NOT NULL DEFAULT 'pdf',
  parameters JSONB NOT NULL DEFAULT '{}',
  
  -- Distribution
  recipients JSONB DEFAULT '[]',
  -- Structure: [{ email: 'user@example.com', name: 'User Name' }]
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_report_queue_org ON report_queue(organization_id);
CREATE INDEX idx_report_queue_status ON report_queue(status);
CREATE INDEX idx_report_queue_requested_by ON report_queue(requested_by);
CREATE INDEX idx_report_queue_queued_at ON report_queue(queued_at);
CREATE INDEX idx_report_queue_trigger_job ON report_queue(trigger_job_id);
CREATE INDEX idx_report_queue_expires ON report_queue(expires_at);

CREATE INDEX idx_report_templates_org ON report_templates(organization_id);
CREATE INDEX idx_scheduled_reports_org ON scheduled_reports(organization_id);
CREATE INDEX idx_scheduled_reports_active ON scheduled_reports(is_active, next_run_at);

-- Triggers
CREATE TRIGGER update_report_queue_updated_at BEFORE UPDATE ON report_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reports_updated_at BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to enqueue a report
CREATE OR REPLACE FUNCTION enqueue_report(
  p_organization_id UUID,
  p_report_type report_type,
  p_report_name VARCHAR,
  p_parameters JSONB,
  p_format report_format DEFAULT 'pdf',
  p_requested_by UUID DEFAULT auth.uid(),
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_report_id UUID;
BEGIN
  INSERT INTO report_queue (
    organization_id,
    report_type,
    report_name,
    description,
    format,
    parameters,
    requested_by
  ) VALUES (
    p_organization_id,
    p_report_type,
    p_report_name,
    p_description,
    p_format,
    p_parameters,
    p_requested_by
  ) RETURNING id INTO v_report_id;
  
  -- Notify via Supabase Realtime
  PERFORM pg_notify(
    'report_status_change',
    json_build_object(
      'report_id', v_report_id,
      'organization_id', p_organization_id,
      'status', 'queued',
      'requested_by', p_requested_by
    )::text
  );
  
  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update report status
CREATE OR REPLACE FUNCTION update_report_status(
  p_report_id UUID,
  p_status report_status,
  p_progress INTEGER DEFAULT NULL,
  p_current_step TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_file_url TEXT DEFAULT NULL,
  p_file_size BIGINT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_org_id UUID;
  v_requested_by UUID;
BEGIN
  -- Get org_id for notification
  SELECT organization_id, requested_by INTO v_org_id, v_requested_by
  FROM report_queue
  WHERE id = p_report_id;
  
  -- Update the report
  UPDATE report_queue
  SET 
    status = p_status,
    progress = COALESCE(p_progress, progress),
    current_step = COALESCE(p_current_step, current_step),
    error_message = p_error_message,
    file_url = COALESCE(p_file_url, file_url),
    file_size_bytes = COALESCE(p_file_size, file_size_bytes),
    started_at = CASE 
      WHEN p_status = 'processing' AND started_at IS NULL THEN NOW()
      ELSE started_at
    END,
    completed_at = CASE 
      WHEN p_status = 'completed' THEN NOW()
      ELSE completed_at
    END,
    failed_at = CASE 
      WHEN p_status = 'failed' THEN NOW()
      ELSE failed_at
    END,
    updated_at = NOW()
  WHERE id = p_report_id;
  
  -- Notify via Supabase Realtime
  PERFORM pg_notify(
    'report_status_change',
    json_build_object(
      'report_id', p_report_id,
      'organization_id', v_org_id,
      'status', p_status,
      'progress', p_progress,
      'requested_by', v_requested_by
    )::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE report_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Users can see reports in their organization
CREATE POLICY "Users can view reports in their organization"
  ON report_queue FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can create reports in their organization
CREATE POLICY "Users can create reports in their organization"
  ON report_queue FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their own reports
CREATE POLICY "Users can update their own reports"
  ON report_queue FOR UPDATE
  USING (
    requested_by = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Report templates policies
CREATE POLICY "Users can view templates in their organization"
  ON report_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/owner can manage templates"
  ON report_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Scheduled reports policies
CREATE POLICY "Users can view scheduled reports in their organization"
  ON scheduled_reports FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/owner can manage scheduled reports"
  ON scheduled_reports FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );