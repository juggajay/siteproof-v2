-- Non-Conformance Reports (NCRs)
CREATE TABLE ncrs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
  inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
  
  -- NCR Details
  ncr_number VARCHAR(50) NOT NULL, -- e.g., NCR-2024-001
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Classification
  severity VARCHAR(50) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  category VARCHAR(100) NOT NULL, -- quality, safety, environmental, etc.
  tags TEXT[] DEFAULT '{}',
  
  -- Location/Context
  location VARCHAR(255),
  trade VARCHAR(100), -- electrical, plumbing, etc.
  
  -- Evidence
  evidence JSONB DEFAULT '{}', -- photos, documents, etc.
  inspection_item_ref VARCHAR(255), -- Reference to specific inspection item
  
  -- People involved
  raised_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  contractor_id UUID REFERENCES organizations(id),
  
  -- Workflow state
  status VARCHAR(50) NOT NULL DEFAULT 'open', -- open, acknowledged, in_progress, resolved, closed, disputed
  priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high, urgent
  
  -- Root cause analysis
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  
  -- Dates
  due_date DATE,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Verification
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  verification_evidence JSONB DEFAULT '{}',
  
  -- Cost impact
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  cost_notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique NCR numbers per organization
  CONSTRAINT unique_ncr_number_per_org UNIQUE(organization_id, ncr_number)
);

-- NCR History/Audit Trail
CREATE TABLE ncr_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ncr_id UUID NOT NULL REFERENCES ncrs(id) ON DELETE CASCADE,
  
  -- Change details
  action VARCHAR(100) NOT NULL, -- created, status_changed, assigned, commented, etc.
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  
  -- Who and when
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Additional context
  comment TEXT,
  changes JSONB DEFAULT '{}', -- Detailed field changes
  attachments JSONB DEFAULT '{}'
);

-- NCR Comments/Discussion
CREATE TABLE ncr_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ncr_id UUID NOT NULL REFERENCES ncrs(id) ON DELETE CASCADE,
  
  -- Comment details
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- Internal notes vs client-visible
  
  -- Author
  author_id UUID NOT NULL REFERENCES users(id),
  author_role VARCHAR(50), -- inspector, contractor, client, etc.
  
  -- Threading
  parent_comment_id UUID REFERENCES ncr_comments(id),
  
  -- Metadata
  attachments JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Notification Queue for NCR events
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Notification details
  type VARCHAR(100) NOT NULL, -- ncr_created, ncr_assigned, ncr_status_changed, etc.
  entity_type VARCHAR(50) NOT NULL, -- ncr, inspection, etc.
  entity_id UUID NOT NULL,
  
  -- Recipients
  recipient_id UUID NOT NULL REFERENCES users(id),
  recipient_email VARCHAR(255) NOT NULL,
  
  -- Content
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Additional context data
  
  -- Delivery
  channel VARCHAR(50) NOT NULL DEFAULT 'email', -- email, sms, push, in_app
  priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high, urgent
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, cancelled
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error TEXT,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_ncrs_organization_id ON ncrs(organization_id);
CREATE INDEX idx_ncrs_project_id ON ncrs(project_id);
CREATE INDEX idx_ncrs_status ON ncrs(status);
CREATE INDEX idx_ncrs_assigned_to ON ncrs(assigned_to);
CREATE INDEX idx_ncrs_raised_by ON ncrs(raised_by);
CREATE INDEX idx_ncrs_due_date ON ncrs(due_date);
CREATE INDEX idx_ncrs_severity ON ncrs(severity);
CREATE INDEX idx_ncrs_created_at ON ncrs(created_at DESC);

CREATE INDEX idx_ncr_history_ncr_id ON ncr_history(ncr_id);
CREATE INDEX idx_ncr_history_performed_at ON ncr_history(performed_at DESC);

CREATE INDEX idx_ncr_comments_ncr_id ON ncr_comments(ncr_id);
CREATE INDEX idx_ncr_comments_created_at ON ncr_comments(created_at DESC);

CREATE INDEX idx_notification_queue_status ON notification_queue(status, scheduled_for)
WHERE status = 'pending';
CREATE INDEX idx_notification_queue_recipient ON notification_queue(recipient_id);
CREATE INDEX idx_notification_queue_entity ON notification_queue(entity_type, entity_id);

-- Update triggers
CREATE TRIGGER update_ncrs_updated_at BEFORE UPDATE ON ncrs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ncr_comments_updated_at BEFORE UPDATE ON ncr_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_queue_updated_at BEFORE UPDATE ON notification_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate NCR numbers
CREATE OR REPLACE FUNCTION generate_ncr_number(p_organization_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_year VARCHAR(4);
  v_sequence INTEGER;
  v_ncr_number VARCHAR(50);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Get next sequence number for this org and year
  SELECT COUNT(*) + 1 INTO v_sequence
  FROM ncrs
  WHERE organization_id = p_organization_id
  AND ncr_number LIKE 'NCR-' || v_year || '-%';
  
  v_ncr_number := 'NCR-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
  
  RETURN v_ncr_number;
END;
$$ LANGUAGE plpgsql;

-- Function to record NCR history
CREATE OR REPLACE FUNCTION record_ncr_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ncr_history (
      ncr_id,
      action,
      to_status,
      performed_by,
      changes
    ) VALUES (
      NEW.id,
      'created',
      NEW.status,
      NEW.raised_by,
      jsonb_build_object(
        'title', NEW.title,
        'severity', NEW.severity,
        'category', NEW.category
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Record status changes
    IF OLD.status != NEW.status THEN
      INSERT INTO ncr_history (
        ncr_id,
        action,
        from_status,
        to_status,
        performed_by,
        changes
      ) VALUES (
        NEW.id,
        'status_changed',
        OLD.status,
        NEW.status,
        COALESCE(NEW.updated_by, NEW.raised_by), -- Need to add updated_by field
        jsonb_build_object(
          'status', jsonb_build_object('from', OLD.status, 'to', NEW.status)
        )
      );
    END IF;
    
    -- Record assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO ncr_history (
        ncr_id,
        action,
        performed_by,
        changes
      ) VALUES (
        NEW.id,
        'assigned',
        COALESCE(NEW.updated_by, NEW.raised_by),
        jsonb_build_object(
          'assigned_to', jsonb_build_object(
            'from', OLD.assigned_to,
            'to', NEW.assigned_to
          )
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ncr_history_trigger
AFTER INSERT OR UPDATE ON ncrs
FOR EACH ROW EXECUTE FUNCTION record_ncr_history();

-- Function to queue notifications
CREATE OR REPLACE FUNCTION queue_notification(
  p_type VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_recipient_id UUID,
  p_subject VARCHAR,
  p_body TEXT,
  p_data JSONB DEFAULT '{}',
  p_priority VARCHAR DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
  v_recipient_email VARCHAR;
  v_notification_id UUID;
BEGIN
  -- Get recipient email
  SELECT email INTO v_recipient_email
  FROM users
  WHERE id = p_recipient_id;
  
  IF v_recipient_email IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Insert notification
  INSERT INTO notification_queue (
    type,
    entity_type,
    entity_id,
    recipient_id,
    recipient_email,
    subject,
    body,
    data,
    priority
  ) VALUES (
    p_type,
    p_entity_type,
    p_entity_id,
    p_recipient_id,
    v_recipient_email,
    p_subject,
    p_body,
    p_data,
    p_priority
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE ncrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncr_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncr_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- NCR policies
CREATE POLICY "Users can view NCRs in their organization"
  ON ncrs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = ncrs.organization_id
      AND om.user_id = auth.uid()
    )
    OR raised_by = auth.uid()
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Users can create NCRs in their projects"
  ON ncrs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = ncrs.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can update NCRs they're involved with"
  ON ncrs FOR UPDATE
  TO authenticated
  USING (
    raised_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = ncrs.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- NCR history policies
CREATE POLICY "Users can view history for NCRs they can see"
  ON ncr_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ncrs
      WHERE ncrs.id = ncr_history.ncr_id
      AND (
        ncrs.raised_by = auth.uid()
        OR ncrs.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = ncrs.organization_id
          AND om.user_id = auth.uid()
        )
      )
    )
  );

-- NCR comments policies
CREATE POLICY "Users can view comments on NCRs they can see"
  ON ncr_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ncrs
      WHERE ncrs.id = ncr_comments.ncr_id
      AND (
        ncrs.raised_by = auth.uid()
        OR ncrs.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = ncrs.organization_id
          AND om.user_id = auth.uid()
        )
      )
    )
    -- Hide internal comments from contractors
    AND (
      NOT is_internal
      OR author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM ncrs
        JOIN organization_members om ON om.organization_id = ncrs.organization_id
        WHERE ncrs.id = ncr_comments.ncr_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'member')
      )
    )
  );

CREATE POLICY "Users can create comments on NCRs they're involved with"
  ON ncr_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ncrs
      WHERE ncrs.id = ncr_comments.ncr_id
      AND (
        ncrs.raised_by = auth.uid()
        OR ncrs.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = ncrs.organization_id
          AND om.user_id = auth.uid()
        )
      )
    )
  );

-- Notification queue policies
CREATE POLICY "Users can view their own notifications"
  ON notification_queue FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "System can manage all notifications"
  ON notification_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);