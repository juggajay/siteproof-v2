-- Company profiles for contractors, suppliers, and service providers
CREATE TABLE company_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Company details
  company_name VARCHAR(255) NOT NULL,
  company_type VARCHAR(50) NOT NULL, -- contractor, supplier, consultant, employee
  tax_id VARCHAR(50),
  registration_number VARCHAR(50),
  
  -- Contact information
  primary_contact_name VARCHAR(255),
  primary_contact_email VARCHAR(255),
  primary_contact_phone VARCHAR(50),
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'US',
  
  -- Financial details (sensitive)
  default_currency VARCHAR(3) DEFAULT 'USD',
  payment_terms INTEGER DEFAULT 30, -- days
  bank_account_details JSONB, -- encrypted in app layer
  tax_rate DECIMAL(5,2),
  
  -- Insurance and compliance
  insurance_details JSONB,
  -- Structure: {
  --   liability: { provider: 'ABC Insurance', policy_number: 'POL123', expiry_date: '2025-12-31', amount: 1000000 },
  --   workers_comp: { ... },
  --   professional_indemnity: { ... }
  -- }
  
  licenses JSONB DEFAULT '[]',
  -- Structure: [{
  --   type: 'Electrical License',
  --   number: 'LIC123',
  --   issuing_authority: 'State Board',
  --   expiry_date: '2025-06-30'
  -- }]
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_company_per_org UNIQUE(organization_id, company_name)
);

-- Rate history for tracking hourly/daily rates
CREATE TABLE rate_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Who/what this rate applies to
  entity_type VARCHAR(50) NOT NULL, -- user, company, equipment, role
  entity_id UUID NOT NULL, -- user_id, company_profile_id, etc.
  
  -- Rate details
  rate_type VARCHAR(50) NOT NULL, -- hourly, daily, project, milestone
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Standard rates
  standard_rate DECIMAL(10,2) NOT NULL,
  overtime_rate DECIMAL(10,2),
  weekend_rate DECIMAL(10,2),
  holiday_rate DECIMAL(10,2),
  
  -- Cost rates (what we pay) vs Bill rates (what we charge)
  is_cost_rate BOOLEAN DEFAULT TRUE,
  bill_rate DECIMAL(10,2), -- if different from standard_rate
  margin_percentage DECIMAL(5,2), -- calculated: ((bill_rate - standard_rate) / standard_rate) * 100
  
  -- Validity period
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  -- Additional details
  notes TEXT,
  project_id UUID REFERENCES projects(id), -- if rate is project-specific
  
  -- Approval workflow
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure no overlapping rates for same entity
  CONSTRAINT no_overlapping_rates EXCLUDE USING gist (
    entity_type WITH =,
    entity_id WITH =,
    rate_type WITH =,
    is_cost_rate WITH =,
    daterange(effective_from, effective_to, '[)') WITH &&
  ) WHERE (project_id IS NULL),
  
  CONSTRAINT no_overlapping_project_rates EXCLUDE USING gist (
    entity_type WITH =,
    entity_id WITH =,
    rate_type WITH =,
    is_cost_rate WITH =,
    project_id WITH =,
    daterange(effective_from, effective_to, '[)') WITH &&
  ) WHERE (project_id IS NOT NULL)
);

-- Financial audit log for tracking all changes to sensitive financial data
CREATE TABLE financial_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- What was changed
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE, VIEW
  
  -- Change details
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  
  -- Context
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  
  -- Who made the change
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'
);

-- Calculated daily costs for workforce (materialized view for performance)
CREATE MATERIALIZED VIEW daily_workforce_costs AS
SELECT 
  dd.id as diary_id,
  dd.organization_id,
  dd.project_id,
  dd.diary_date,
  jsonb_agg(
    jsonb_build_object(
      'trade', trade_data->>'trade',
      'company', trade_data->>'company',
      'workers', (trade_data->>'workers')::INTEGER,
      'total_hours', COALESCE((trade_data->>'total_hours')::DECIMAL, 8),
      'cost_calculation', (
        SELECT jsonb_build_object(
          'base_cost', 
            CASE 
              WHEN cp.id IS NOT NULL THEN
                (trade_data->>'workers')::INTEGER * 
                COALESCE((trade_data->>'total_hours')::DECIMAL, 8) * 
                COALESCE(rh.standard_rate, 0)
              ELSE 0
            END,
          'rate_used', COALESCE(rh.standard_rate, 0),
          'rate_type', rh.rate_type,
          'rate_id', rh.id
        )
        FROM company_profiles cp
        LEFT JOIN rate_history rh ON 
          rh.entity_type = 'company' AND 
          rh.entity_id = cp.id AND
          rh.is_cost_rate = true AND
          dd.diary_date BETWEEN rh.effective_from AND COALESCE(rh.effective_to, '9999-12-31')
        WHERE cp.organization_id = dd.organization_id
        AND cp.company_name = trade_data->>'company'
        AND cp.is_active = true
        LIMIT 1
      )
    )
  ) as workforce_costs,
  (
    SELECT SUM(
      (trade_data->>'workers')::INTEGER * 
      COALESCE((trade_data->>'total_hours')::DECIMAL, 8) * 
      COALESCE(rh.standard_rate, 0)
    )
    FROM jsonb_array_elements(dd.trades_on_site) as trade_data
    LEFT JOIN company_profiles cp ON 
      cp.organization_id = dd.organization_id AND 
      cp.company_name = trade_data->>'company' AND
      cp.is_active = true
    LEFT JOIN rate_history rh ON 
      rh.entity_type = 'company' AND 
      rh.entity_id = cp.id AND
      rh.is_cost_rate = true AND
      dd.diary_date BETWEEN rh.effective_from AND COALESCE(rh.effective_to, '9999-12-31')
  ) as total_daily_cost
FROM daily_diaries dd
GROUP BY dd.id, dd.organization_id, dd.project_id, dd.diary_date;

-- Indexes
CREATE INDEX idx_company_profiles_org ON company_profiles(organization_id);
CREATE INDEX idx_company_profiles_type ON company_profiles(company_type);
CREATE INDEX idx_company_profiles_active ON company_profiles(is_active) WHERE is_active = true;

CREATE INDEX idx_rate_history_entity ON rate_history(entity_type, entity_id);
CREATE INDEX idx_rate_history_dates ON rate_history(effective_from, effective_to);
CREATE INDEX idx_rate_history_org ON rate_history(organization_id);
CREATE INDEX idx_rate_history_project ON rate_history(project_id) WHERE project_id IS NOT NULL;

CREATE INDEX idx_financial_audit_table_record ON financial_audit_log(table_name, record_id);
CREATE INDEX idx_financial_audit_performed ON financial_audit_log(performed_by, performed_at);
CREATE INDEX idx_financial_audit_org ON financial_audit_log(organization_id);

CREATE INDEX idx_workforce_costs_diary ON daily_workforce_costs(diary_id);
CREATE INDEX idx_workforce_costs_project ON daily_workforce_costs(project_id);
CREATE INDEX idx_workforce_costs_date ON daily_workforce_costs(diary_date);

-- Triggers
CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON company_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log financial data access
CREATE OR REPLACE FUNCTION log_financial_access(
  p_table_name VARCHAR,
  p_record_id UUID,
  p_action VARCHAR,
  p_user_id UUID,
  p_organization_id UUID,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO financial_audit_log (
    organization_id,
    table_name,
    record_id,
    action,
    performed_by,
    metadata
  ) VALUES (
    p_organization_id,
    p_table_name,
    p_record_id,
    p_action,
    p_user_id,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate margin
CREATE OR REPLACE FUNCTION calculate_rate_margin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bill_rate IS NOT NULL AND NEW.standard_rate > 0 THEN
    NEW.margin_percentage := ((NEW.bill_rate - NEW.standard_rate) / NEW.standard_rate) * 100;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_margin_on_rate
BEFORE INSERT OR UPDATE ON rate_history
FOR EACH ROW EXECUTE FUNCTION calculate_rate_margin();

-- Function to get current rate for an entity
CREATE OR REPLACE FUNCTION get_current_rate(
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_date DATE DEFAULT CURRENT_DATE,
  p_rate_type VARCHAR DEFAULT 'hourly',
  p_is_cost_rate BOOLEAN DEFAULT TRUE,
  p_project_id UUID DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
  v_rate DECIMAL;
BEGIN
  -- First try to find project-specific rate
  IF p_project_id IS NOT NULL THEN
    SELECT standard_rate INTO v_rate
    FROM rate_history
    WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND rate_type = p_rate_type
    AND is_cost_rate = p_is_cost_rate
    AND project_id = p_project_id
    AND p_date BETWEEN effective_from AND COALESCE(effective_to, '9999-12-31')
    ORDER BY effective_from DESC
    LIMIT 1;
    
    IF v_rate IS NOT NULL THEN
      RETURN v_rate;
    END IF;
  END IF;
  
  -- Fall back to general rate
  SELECT standard_rate INTO v_rate
  FROM rate_history
  WHERE entity_type = p_entity_type
  AND entity_id = p_entity_id
  AND rate_type = p_rate_type
  AND is_cost_rate = p_is_cost_rate
  AND project_id IS NULL
  AND p_date BETWEEN effective_from AND COALESCE(effective_to, '9999-12-31')
  ORDER BY effective_from DESC
  LIMIT 1;
  
  RETURN COALESCE(v_rate, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to refresh workforce costs view
CREATE OR REPLACE FUNCTION refresh_workforce_costs()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_workforce_costs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;