-- Enhanced Cost Tracking System Tables
-- This migration adds comprehensive cost tracking for labour, plant, and materials

-- 1. Employees table (linked to companies)
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Employee details
  employee_code VARCHAR(50) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  
  -- Employment details
  role VARCHAR(100),
  trade VARCHAR(100),
  employment_type VARCHAR(50) CHECK (employment_type IN ('full_time', 'part_time', 'contractor', 'casual')),
  start_date DATE,
  end_date DATE,
  
  -- Rates (can be overridden per project)
  standard_hourly_rate DECIMAL(10, 2),
  overtime_hourly_rate DECIMAL(10, 2),
  daily_rate DECIMAL(10, 2),
  
  -- Certifications and skills
  certifications JSONB DEFAULT '[]',
  skills JSONB DEFAULT '[]',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Plant/Equipment table
CREATE TABLE IF NOT EXISTS plant_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Equipment details
  equipment_code VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- e.g., 'Excavator', 'Crane', 'Generator'
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  serial_number VARCHAR(100),
  
  -- Ownership
  ownership_type VARCHAR(50) CHECK (ownership_type IN ('owned', 'leased', 'rented')),
  supplier_id UUID REFERENCES company_profiles(id),
  
  -- Rates
  hourly_rate DECIMAL(10, 2),
  daily_rate DECIMAL(10, 2),
  weekly_rate DECIMAL(10, 2),
  monthly_rate DECIMAL(10, 2),
  
  -- Operating costs
  fuel_cost_per_hour DECIMAL(10, 2),
  operator_required BOOLEAN DEFAULT false,
  
  -- Maintenance
  last_service_date DATE,
  next_service_date DATE,
  service_interval_hours INTEGER,
  current_hours INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 3. Materials catalog
CREATE TABLE IF NOT EXISTS materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Material details
  material_code VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- e.g., 'Concrete', 'Steel', 'Timber'
  subcategory VARCHAR(100),
  
  -- Units and measurements
  unit_of_measure VARCHAR(50) NOT NULL, -- e.g., 'm3', 'kg', 'each'
  unit_cost DECIMAL(10, 4),
  
  -- Supplier information
  preferred_supplier_id UUID REFERENCES company_profiles(id),
  alternative_suppliers JSONB DEFAULT '[]',
  
  -- Specifications
  specifications JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Employee rates history (track rate changes over time)
CREATE TABLE IF NOT EXISTS employee_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL for standard rates
  
  -- Rates
  standard_hourly_rate DECIMAL(10, 2),
  overtime_hourly_rate DECIMAL(10, 2),
  daily_rate DECIMAL(10, 2),
  
  -- Validity period
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure no overlapping periods for same employee/project
  CONSTRAINT no_overlapping_rates EXCLUDE USING gist (
    employee_id WITH =,
    project_id WITH =,
    daterange(effective_from, effective_to, '[)') WITH &&
  )
);

-- 5. Plant rates history
CREATE TABLE IF NOT EXISTS plant_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES plant_equipment(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL for standard rates
  
  -- Rates
  hourly_rate DECIMAL(10, 2),
  daily_rate DECIMAL(10, 2),
  weekly_rate DECIMAL(10, 2),
  monthly_rate DECIMAL(10, 2),
  
  -- Operating costs
  fuel_cost_per_hour DECIMAL(10, 2),
  
  -- Validity period
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 6. Material costs history (track supplier pricing over time)
CREATE TABLE IF NOT EXISTS material_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES company_profiles(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL for standard pricing
  
  -- Pricing
  unit_cost DECIMAL(10, 4) NOT NULL,
  bulk_discount_qty INTEGER,
  bulk_discount_rate DECIMAL(5, 2),
  
  -- Validity period
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 7. Daily diary labour entries (enhanced)
CREATE TABLE IF NOT EXISTS diary_labour_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  diary_id UUID NOT NULL REFERENCES daily_diaries(id) ON DELETE CASCADE,
  
  -- Employee or trade group
  employee_id UUID REFERENCES employees(id),
  trade VARCHAR(100),
  company_id UUID REFERENCES company_profiles(id),
  
  -- Time tracking
  start_time TIME,
  end_time TIME,
  break_duration INTERVAL,
  total_hours DECIMAL(5, 2),
  overtime_hours DECIMAL(5, 2),
  
  -- Rates and costs
  standard_rate DECIMAL(10, 2),
  overtime_rate DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  
  -- Work details
  work_performed TEXT,
  location VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 8. Daily diary plant entries
CREATE TABLE IF NOT EXISTS diary_plant_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  diary_id UUID NOT NULL REFERENCES daily_diaries(id) ON DELETE CASCADE,
  
  -- Equipment
  equipment_id UUID REFERENCES plant_equipment(id),
  equipment_name VARCHAR(255), -- For external equipment
  supplier_id UUID REFERENCES company_profiles(id),
  
  -- Usage
  start_time TIME,
  end_time TIME,
  total_hours DECIMAL(5, 2),
  
  -- Operator
  operator_id UUID REFERENCES employees(id),
  operator_name VARCHAR(255),
  
  -- Costs
  hourly_rate DECIMAL(10, 2),
  fuel_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  
  -- Work details
  work_performed TEXT,
  location VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 9. Daily diary material entries
CREATE TABLE IF NOT EXISTS diary_material_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  diary_id UUID NOT NULL REFERENCES daily_diaries(id) ON DELETE CASCADE,
  
  -- Material
  material_id UUID REFERENCES materials(id),
  material_name VARCHAR(255), -- For non-catalog materials
  supplier_id UUID REFERENCES company_profiles(id),
  
  -- Quantity
  quantity DECIMAL(10, 3) NOT NULL,
  unit_of_measure VARCHAR(50),
  
  -- Costs
  unit_cost DECIMAL(10, 4),
  total_cost DECIMAL(10, 2),
  
  -- Delivery details
  delivery_time TIME,
  delivery_location VARCHAR(255),
  delivery_note VARCHAR(255),
  docket_number VARCHAR(100),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_organization ON employees(organization_id);
CREATE INDEX idx_employees_active ON employees(is_active);

CREATE INDEX idx_plant_company ON plant_equipment(company_id);
CREATE INDEX idx_plant_organization ON plant_equipment(organization_id);
CREATE INDEX idx_plant_status ON plant_equipment(status);

CREATE INDEX idx_materials_organization ON materials(organization_id);
CREATE INDEX idx_materials_category ON materials(category);

CREATE INDEX idx_diary_labour_diary ON diary_labour_entries(diary_id);
CREATE INDEX idx_diary_plant_diary ON diary_plant_entries(diary_id);
CREATE INDEX idx_diary_material_diary ON diary_material_entries(diary_id);

-- RLS Policies

-- Employees policies
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employees in their organization"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = employees.organization_id
    )
  );

CREATE POLICY "Admins can manage employees"
  ON employees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = employees.organization_id
      AND om.role IN ('owner', 'admin')
    )
  );

-- Plant equipment policies
ALTER TABLE plant_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view equipment in their organization"
  ON plant_equipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = plant_equipment.organization_id
    )
  );

CREATE POLICY "Admins can manage equipment"
  ON plant_equipment FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = plant_equipment.organization_id
      AND om.role IN ('owner', 'admin', 'project_manager')
    )
  );

-- Materials policies
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view materials in their organization"
  ON materials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = materials.organization_id
    )
  );

CREATE POLICY "Admins can manage materials"
  ON materials FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = materials.organization_id
      AND om.role IN ('owner', 'admin', 'project_manager')
    )
  );

-- Enable RLS on diary entry tables
ALTER TABLE diary_labour_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_plant_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_material_entries ENABLE ROW LEVEL SECURITY;

-- Diary entry policies (inherit from daily_diaries permissions)
CREATE POLICY "Users can manage diary labour entries"
  ON diary_labour_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_diaries dd
      JOIN projects p ON dd.project_id = p.id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE dd.id = diary_labour_entries.diary_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage diary plant entries"
  ON diary_plant_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_diaries dd
      JOIN projects p ON dd.project_id = p.id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE dd.id = diary_plant_entries.diary_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage diary material entries"
  ON diary_material_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_diaries dd
      JOIN projects p ON dd.project_id = p.id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE dd.id = diary_material_entries.diary_id
      AND om.user_id = auth.uid()
    )
  );