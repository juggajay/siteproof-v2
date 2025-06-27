-- Enable RLS on financial tables
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audit_log ENABLE ROW LEVEL SECURITY;

-- Company profiles policies
CREATE POLICY "Users can view company profiles in their organization"
  ON company_profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/owner can create company profiles"
  ON company_profiles FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admin/owner can update company profiles"
  ON company_profiles FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admin/owner can delete company profiles"
  ON company_profiles FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Rate history policies with role-based visibility
CREATE POLICY "Only financial roles can view rates"
  ON rate_history FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'finance_manager', 'accountant')
    )
  );

CREATE POLICY "Only admin/owner/finance can create rates"
  ON rate_history FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'finance_manager')
    )
  );

CREATE POLICY "Only admin/owner/finance can update rates"
  ON rate_history FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'finance_manager')
    )
  );

CREATE POLICY "Only admin/owner can delete rates"
  ON rate_history FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Financial audit log policies
CREATE POLICY "Only financial roles can view audit logs"
  ON financial_audit_log FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'finance_manager', 'accountant', 'auditor')
    )
  );

-- Audit logs are inserted via function, no direct insert policy needed

-- Function to check if user has financial access
CREATE OR REPLACE FUNCTION has_financial_access(
  p_organization_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND role IN ('owner', 'admin', 'finance_manager', 'accountant')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's financial role
CREATE OR REPLACE FUNCTION get_financial_role(
  p_organization_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM organization_members
  WHERE organization_id = p_organization_id
  AND user_id = p_user_id;
  
  -- Return simplified financial role
  CASE v_role
    WHEN 'owner' THEN RETURN 'full_access';
    WHEN 'admin' THEN RETURN 'full_access';
    WHEN 'finance_manager' THEN RETURN 'financial_access';
    WHEN 'accountant' THEN RETURN 'read_only_financial';
    WHEN 'auditor' THEN RETURN 'audit_only';
    ELSE RETURN 'no_access';
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create filtered view of daily diaries based on role
CREATE OR REPLACE FUNCTION get_diary_with_financial_data(
  p_diary_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  id UUID,
  diary_number VARCHAR,
  diary_date DATE,
  organization_id UUID,
  project_id UUID,
  weather JSONB,
  work_summary TEXT,
  trades_on_site JSONB,
  equipment_on_site JSONB,
  materials_delivered JSONB,
  delays JSONB,
  safety_incidents JSONB,
  visitors JSONB,
  instructions_received JSONB,
  rfi_submitted JSONB,
  quality_issues JSONB,
  environmental_conditions JSONB,
  hot_works JSONB,
  permits JSONB,
  temporary_works JSONB,
  photos JSONB,
  attachments JSONB,
  total_workers INTEGER,
  workforce_costs JSONB,
  total_daily_cost DECIMAL,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  is_locked BOOLEAN,
  notes TEXT
)
AS $$
DECLARE
  v_has_access BOOLEAN;
  v_org_id UUID;
BEGIN
  -- Get organization ID from diary
  SELECT dd.organization_id INTO v_org_id
  FROM daily_diaries dd
  WHERE dd.id = p_diary_id;
  
  -- Check if user has financial access
  v_has_access := has_financial_access(v_org_id, p_user_id);
  
  -- Return diary with or without financial data based on access
  IF v_has_access THEN
    -- User has financial access, return everything including costs
    RETURN QUERY
    SELECT 
      dd.*,
      dwc.workforce_costs,
      dwc.total_daily_cost
    FROM daily_diaries dd
    LEFT JOIN daily_workforce_costs dwc ON dwc.diary_id = dd.id
    WHERE dd.id = p_diary_id;
  ELSE
    -- User doesn't have financial access, return diary without costs
    RETURN QUERY
    SELECT 
      dd.*,
      NULL::JSONB as workforce_costs,
      NULL::DECIMAL as total_daily_cost
    FROM daily_diaries dd
    WHERE dd.id = p_diary_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get filtered trades data (without rates for non-financial users)
CREATE OR REPLACE FUNCTION get_trades_for_diary(
  p_diary_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
  v_has_access BOOLEAN;
  v_org_id UUID;
  v_trades JSONB;
BEGIN
  -- Get organization ID from diary
  SELECT dd.organization_id INTO v_org_id
  FROM daily_diaries dd
  WHERE dd.id = p_diary_id;
  
  -- Check if user has financial access
  v_has_access := has_financial_access(v_org_id, p_user_id);
  
  -- Get trades data
  SELECT trades_on_site INTO v_trades
  FROM daily_diaries
  WHERE id = p_diary_id;
  
  -- If user doesn't have financial access, strip rate information
  IF NOT v_has_access AND v_trades IS NOT NULL THEN
    SELECT jsonb_agg(
      trade_item - 'hourly_rate' - 'daily_rate' - 'total_cost'
    )
    INTO v_trades
    FROM jsonb_array_elements(v_trades) as trade_item;
  END IF;
  
  RETURN v_trades;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit trigger for rate changes
CREATE OR REPLACE FUNCTION audit_rate_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO financial_audit_log (
      organization_id,
      table_name,
      record_id,
      action,
      new_values,
      changed_fields,
      performed_by
    ) VALUES (
      NEW.organization_id,
      'rate_history',
      NEW.id,
      'INSERT',
      to_jsonb(NEW),
      ARRAY(SELECT jsonb_object_keys(to_jsonb(NEW))),
      NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO financial_audit_log (
      organization_id,
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      changed_fields,
      performed_by
    ) VALUES (
      NEW.organization_id,
      'rate_history',
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      ARRAY(
        SELECT jsonb_object_keys(to_jsonb(NEW))
        WHERE to_jsonb(NEW)->>jsonb_object_keys(to_jsonb(NEW)) 
          IS DISTINCT FROM to_jsonb(OLD)->>jsonb_object_keys(to_jsonb(OLD))
      ),
      auth.uid()
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO financial_audit_log (
      organization_id,
      table_name,
      record_id,
      action,
      old_values,
      performed_by
    ) VALUES (
      OLD.organization_id,
      'rate_history',
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      auth.uid()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_rate_history_changes
AFTER INSERT OR UPDATE OR DELETE ON rate_history
FOR EACH ROW EXECUTE FUNCTION audit_rate_change();

-- Audit trigger for company profile changes (financial data)
CREATE OR REPLACE FUNCTION audit_company_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only audit if financial fields are changed
  IF TG_OP = 'UPDATE' AND (
    OLD.default_currency IS DISTINCT FROM NEW.default_currency OR
    OLD.payment_terms IS DISTINCT FROM NEW.payment_terms OR
    OLD.bank_account_details IS DISTINCT FROM NEW.bank_account_details OR
    OLD.tax_rate IS DISTINCT FROM NEW.tax_rate
  ) THEN
    INSERT INTO financial_audit_log (
      organization_id,
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      changed_fields,
      performed_by
    ) VALUES (
      NEW.organization_id,
      'company_profiles',
      NEW.id,
      'UPDATE',
      jsonb_build_object(
        'default_currency', OLD.default_currency,
        'payment_terms', OLD.payment_terms,
        'tax_rate', OLD.tax_rate
      ),
      jsonb_build_object(
        'default_currency', NEW.default_currency,
        'payment_terms', NEW.payment_terms,
        'tax_rate', NEW.tax_rate
      ),
      ARRAY(
        SELECT field FROM (
          VALUES 
            ('default_currency', OLD.default_currency, NEW.default_currency),
            ('payment_terms', OLD.payment_terms, NEW.payment_terms),
            ('tax_rate', OLD.tax_rate, NEW.tax_rate)
        ) AS t(field, old_val, new_val)
        WHERE old_val IS DISTINCT FROM new_val
      ),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_company_financial_changes
AFTER UPDATE ON company_profiles
FOR EACH ROW EXECUTE FUNCTION audit_company_profile_change();

-- Indexes for financial role checks
CREATE INDEX idx_org_members_financial_roles 
ON organization_members(organization_id, user_id, role)
WHERE role IN ('owner', 'admin', 'finance_manager', 'accountant', 'auditor');

-- Grant permissions for materialized view refresh
GRANT SELECT ON daily_diaries TO authenticated;
GRANT SELECT ON company_profiles TO authenticated;
GRANT SELECT ON rate_history TO authenticated;
GRANT SELECT ON daily_workforce_costs TO authenticated;