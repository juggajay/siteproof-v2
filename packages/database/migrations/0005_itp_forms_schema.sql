-- ITP Forms Schema
-- This migration creates tables for all ITP form types with offline sync capabilities

-- Common inspection status enum
CREATE TYPE inspection_status AS ENUM ('pending', 'approved', 'rejected');

-- Base table for all ITP forms with common fields
CREATE TABLE itp_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_type VARCHAR(100) NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    inspector_name VARCHAR(255) NOT NULL,
    inspection_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    inspection_status inspection_status NOT NULL DEFAULT 'pending',
    comments TEXT,
    evidence_files JSONB DEFAULT '[]'::jsonb,
    sync_status VARCHAR(50) DEFAULT 'pending', -- pending, synced, failed
    local_id VARCHAR(255), -- For offline sync reference
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT unique_local_id UNIQUE (local_id, created_by)
);

-- Earthworks Preconstruction & Erosion/Sediment Control
CREATE TABLE itp_earthworks_preconstruction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES itp_forms(id) ON DELETE CASCADE,
    approved_plans_available BOOLEAN NOT NULL DEFAULT false,
    start_date_advised DATE,
    erosion_control_implemented BOOLEAN NOT NULL DEFAULT false,
    erosion_control_photo TEXT, -- URL or base64
    hold_point_signature TEXT, -- base64 signature
    hold_point_date TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_form FOREIGN KEY (form_id) REFERENCES itp_forms(id)
);

-- Earthworks Subgrade Preparation & Sub Base
CREATE TABLE itp_earthworks_subgrade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES itp_forms(id) ON DELETE CASCADE,
    erosion_controls_in_place BOOLEAN NOT NULL DEFAULT false,
    groundwater_control_measures BOOLEAN NOT NULL DEFAULT false,
    compaction_percentage DECIMAL(5,2) CHECK (compaction_percentage >= 0 AND compaction_percentage <= 100),
    surface_tolerances_met BOOLEAN NOT NULL DEFAULT false,
    surface_measurements JSONB DEFAULT '{}'::jsonb,
    proof_rolling_completed BOOLEAN NOT NULL DEFAULT false,
    proof_rolling_photo TEXT,
    nata_certificates JSONB DEFAULT '[]'::jsonb
);

-- Road Services Crossings & Kerbing
CREATE TABLE itp_road_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES itp_forms(id) ON DELETE CASCADE,
    services_backfilled_correctly BOOLEAN NOT NULL DEFAULT false,
    subgrade_prepared BOOLEAN NOT NULL DEFAULT false,
    sub_base_gradings DECIMAL(10,2),
    sub_base_pi DECIMAL(10,2),
    sub_base_cbr DECIMAL(10,2),
    kerbing_installed BOOLEAN NOT NULL DEFAULT false,
    kerbing_level_measurements JSONB DEFAULT '{}'::jsonb,
    kerbing_width_measurements JSONB DEFAULT '{}'::jsonb,
    nata_certificates JSONB DEFAULT '[]'::jsonb
);

-- Basecourse Construction
CREATE TABLE itp_basecourse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES itp_forms(id) ON DELETE CASCADE,
    kerbing_conformity BOOLEAN NOT NULL DEFAULT false,
    base_material_gradings DECIMAL(10,2),
    base_material_pi DECIMAL(10,2),
    base_material_cbr DECIMAL(10,2),
    layer_spread_compacted BOOLEAN NOT NULL DEFAULT false,
    deflection_testing_results DECIMAL(10,2),
    nata_certificates JSONB DEFAULT '[]'::jsonb
);

-- Asphalt Seal / Bitumen Seal
CREATE TABLE itp_asphalt_seal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES itp_forms(id) ON DELETE CASCADE,
    basecourse_completed BOOLEAN NOT NULL DEFAULT false,
    pavement_surface_condition BOOLEAN NOT NULL DEFAULT false,
    weather_suitable BOOLEAN NOT NULL DEFAULT false,
    temperature DECIMAL(5,2),
    tack_coat_applied BOOLEAN NOT NULL DEFAULT false,
    thickness_mm DECIMAL(10,2),
    manufacturer_certificates JSONB DEFAULT '[]'::jsonb,
    weigh_bridge_dockets JSONB DEFAULT '[]'::jsonb
);

-- Signs, Devices and Linemarking
CREATE TABLE itp_signs_linemarking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES itp_forms(id) ON DELETE CASCADE,
    seal_completion BOOLEAN NOT NULL DEFAULT false,
    materials_conform BOOLEAN NOT NULL DEFAULT false,
    installation_per_plans BOOLEAN NOT NULL DEFAULT false,
    installation_photos JSONB DEFAULT '[]'::jsonb,
    concrete_footings BOOLEAN NOT NULL DEFAULT false,
    strength_test_mpa DECIMAL(10,2),
    linemarking_with_traffic_control BOOLEAN NOT NULL DEFAULT false
);

-- Drainage Preconstruction
CREATE TABLE itp_drainage_preconstruction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES itp_forms(id) ON DELETE CASCADE,
    approved_plans_available BOOLEAN NOT NULL DEFAULT false,
    earthworks_completed BOOLEAN NOT NULL DEFAULT false,
    start_date_advised DATE,
    materials_comply BOOLEAN NOT NULL DEFAULT false,
    compliance_certificates JSONB DEFAULT '[]'::jsonb,
    hold_point_signature TEXT,
    hold_point_date TIMESTAMP WITH TIME ZONE
);

-- Drainage Excavation & Pipelaying
CREATE TABLE itp_drainage_excavation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES itp_forms(id) ON DELETE CASCADE,
    trench_marked_excavated BOOLEAN NOT NULL DEFAULT false,
    trench_depth_m DECIMAL(10,2),
    sediment_control BOOLEAN NOT NULL DEFAULT false,
    shoring_deep_trenches BOOLEAN NOT NULL DEFAULT false,
    groundwater_control BOOLEAN NOT NULL DEFAULT false,
    bedding_compacted_pipes_laid BOOLEAN NOT NULL DEFAULT false,
    joint_check_completed BOOLEAN NOT NULL DEFAULT false,
    hold_point_signature TEXT,
    hold_point_date TIMESTAMP WITH TIME ZONE
);

-- Drainage Backfill
CREATE TABLE itp_drainage_backfill (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES itp_forms(id) ON DELETE CASCADE,
    pipelaying_complete BOOLEAN NOT NULL DEFAULT false,
    bulkheads_installed BOOLEAN NOT NULL DEFAULT false,
    backfill_material_gradings DECIMAL(10,2),
    compaction_completed BOOLEAN NOT NULL DEFAULT false,
    nata_certificates JSONB DEFAULT '[]'::jsonb
);

-- Drainage Pits / Lintels / Grates
CREATE TABLE itp_drainage_pits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES itp_forms(id) ON DELETE CASCADE,
    pipelaying_complete BOOLEAN NOT NULL DEFAULT false,
    pits_aligned_installed BOOLEAN NOT NULL DEFAULT false,
    plumb_check_completed BOOLEAN NOT NULL DEFAULT false,
    subsoil_drainage_connected BOOLEAN NOT NULL DEFAULT false,
    pits_poured BOOLEAN NOT NULL DEFAULT false,
    joints_flush BOOLEAN NOT NULL DEFAULT false,
    hold_point_signature TEXT,
    hold_point_date TIMESTAMP WITH TIME ZONE
);

-- Subsoil Drainage / Pit Grate Covers & Surrounds
CREATE TABLE itp_subsoil_drainage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES itp_forms(id) ON DELETE CASCADE,
    pipelaying_pits_conform BOOLEAN NOT NULL DEFAULT false,
    select_fill_placed BOOLEAN NOT NULL DEFAULT false,
    grate_covers_installed BOOLEAN NOT NULL DEFAULT false,
    subsoil_drains_connected BOOLEAN NOT NULL DEFAULT false,
    grading_percentage DECIMAL(5,2),
    nata_certificates JSONB DEFAULT '[]'::jsonb,
    wae_spreadsheet JSONB DEFAULT '[]'::jsonb
);

-- Concrete Pre-Placement (Formwork & Reinforcement)
CREATE TABLE itp_concrete_preplacement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES itp_forms(id) ON DELETE CASCADE,
    survey_verification BOOLEAN NOT NULL DEFAULT false,
    formwork_erected BOOLEAN NOT NULL DEFAULT false,
    formwork_measurements JSONB DEFAULT '{}'::jsonb,
    reinforcement_placed BOOLEAN NOT NULL DEFAULT false,
    cover_spacing_measurements JSONB DEFAULT '{}'::jsonb,
    embedded_items_prepared BOOLEAN NOT NULL DEFAULT false,
    hold_point_signature TEXT,
    hold_point_date TIMESTAMP WITH TIME ZONE,
    nata_certificates JSONB DEFAULT '[]'::jsonb
);

-- Concrete Placement & Compaction
CREATE TABLE itp_concrete_placement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES itp_forms(id) ON DELETE CASCADE,
    preplacement_released BOOLEAN NOT NULL DEFAULT false,
    evaporation_rate DECIMAL(5,2) CHECK (evaporation_rate >= 0),
    concrete_slump_mm DECIMAL(10,2),
    concrete_temperature DECIMAL(5,2),
    placement_method TEXT,
    compaction_achieved BOOLEAN NOT NULL DEFAULT false,
    vibration_checks TEXT,
    hold_point_signature TEXT,
    hold_point_date TIMESTAMP WITH TIME ZONE,
    test_results JSONB DEFAULT '[]'::jsonb
);

-- Concrete Curing & Finishing
CREATE TABLE itp_concrete_curing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES itp_forms(id) ON DELETE CASCADE,
    placement_complete BOOLEAN NOT NULL DEFAULT false,
    curing_method_applied BOOLEAN NOT NULL DEFAULT false,
    curing_method_type VARCHAR(100),
    curing_duration_days INTEGER,
    surface_finish_tolerances BOOLEAN NOT NULL DEFAULT false,
    surface_measurements JSONB DEFAULT '{}'::jsonb,
    early_loading_tests DECIMAL(10,2),
    hold_point_signature TEXT,
    hold_point_date TIMESTAMP WITH TIME ZONE,
    test_certificates_7_28_day JSONB DEFAULT '[]'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_itp_forms_project_id ON itp_forms(project_id);
CREATE INDEX idx_itp_forms_organization_id ON itp_forms(organization_id);
CREATE INDEX idx_itp_forms_created_by ON itp_forms(created_by);
CREATE INDEX idx_itp_forms_sync_status ON itp_forms(sync_status);
CREATE INDEX idx_itp_forms_form_type ON itp_forms(form_type);

-- RLS Policies
ALTER TABLE itp_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ITP forms in their organization" ON itp_forms
    FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create ITP forms in their organization" ON itp_forms
    FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own ITP forms" ON itp_forms
    FOR UPDATE
    USING (created_by = auth.uid());

-- Apply similar RLS policies to all child tables
DO $$
DECLARE
    tbl_name text;
BEGIN
    FOR tbl_name IN 
        SELECT unnest(ARRAY[
            'itp_earthworks_preconstruction',
            'itp_earthworks_subgrade',
            'itp_road_services',
            'itp_basecourse',
            'itp_asphalt_seal',
            'itp_signs_linemarking',
            'itp_drainage_preconstruction',
            'itp_drainage_excavation',
            'itp_drainage_backfill',
            'itp_drainage_pits',
            'itp_subsoil_drainage',
            'itp_concrete_preplacement',
            'itp_concrete_placement',
            'itp_concrete_curing'
        ])
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl_name);
        
        EXECUTE format('CREATE POLICY "Users can view %I in their organization" ON %I
            FOR SELECT
            USING (form_id IN (
                SELECT id FROM itp_forms WHERE organization_id IN (
                    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
                )
            ))', tbl_name, tbl_name);
            
        EXECUTE format('CREATE POLICY "Users can create %I for their forms" ON %I
            FOR INSERT
            WITH CHECK (form_id IN (
                SELECT id FROM itp_forms WHERE created_by = auth.uid()
            ))', tbl_name, tbl_name);
            
        EXECUTE format('CREATE POLICY "Users can update %I for their forms" ON %I
            FOR UPDATE
            USING (form_id IN (
                SELECT id FROM itp_forms WHERE created_by = auth.uid()
            ))', tbl_name, tbl_name);
    END LOOP;
END $$;