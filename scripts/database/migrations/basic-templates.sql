-- Basic ITP Templates
-- This script creates essential ITP templates to resolve the "no template available" error

-- Get the organization and user IDs (adjust these as needed)
-- You'll need to replace these with actual IDs from your database

DO $$
DECLARE
    org_id UUID;
    user_id UUID;
BEGIN
    -- Get the first organization
    SELECT id INTO org_id FROM organizations LIMIT 1;
    
    -- Get the first user
    SELECT id INTO user_id FROM users LIMIT 1;
    
    -- Check if we have both
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'No organization found. Please create an organization first.';
    END IF;
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'No user found. Please create a user first.';
    END IF;
    
    -- Insert Site Establishment template
    INSERT INTO itp_templates (
        id,
        organization_id,
        name,
        description,
        category,
        structure,
        is_active,
        version,
        usage_count,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        org_id,
        'Site Establishment',
        'Basic site establishment and preparation inspection template',
        'Site Works',
        '{
            "sections": [
                {
                    "id": "section-1",
                    "title": "Site Setup",
                    "description": "Initial site setup and preparation",
                    "items": [
                        {
                            "id": "item-1",
                            "type": "checkbox",
                            "label": "Site boundaries marked and secured",
                            "required": true
                        },
                        {
                            "id": "item-2", 
                            "type": "checkbox",
                            "label": "Safety signage installed",
                            "required": true
                        },
                        {
                            "id": "item-3",
                            "type": "textarea",
                            "label": "Additional notes",
                            "required": false
                        }
                    ]
                }
            ]
        }'::jsonb,
        true,
        1,
        0,
        user_id,
        NOW(),
        NOW()
    );

    -- Insert Concrete Works template
    INSERT INTO itp_templates (
        id,
        organization_id,
        name,
        description,
        category,
        structure,
        is_active,
        version,
        usage_count,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        org_id,
        'Concrete Works',
        'Concrete placement and finishing inspection template',
        'Structural',
        '{
            "sections": [
                {
                    "id": "section-1",
                    "title": "Pre-Pour Inspection",
                    "description": "Checks before concrete placement",
                    "items": [
                        {
                            "id": "item-1",
                            "type": "checkbox",
                            "label": "Formwork checked and approved",
                            "required": true
                        },
                        {
                            "id": "item-2",
                            "type": "checkbox", 
                            "label": "Reinforcement in place and tied",
                            "required": true
                        },
                        {
                            "id": "item-3",
                            "type": "number",
                            "label": "Concrete temperature (°C)",
                            "required": true,
                            "min": 5,
                            "max": 35
                        }
                    ]
                }
            ]
        }'::jsonb,
        true,
        1,
        0,
        user_id,
        NOW(),
        NOW()
    );

    -- Insert Earthworks template
    INSERT INTO itp_templates (
        id,
        organization_id,
        name,
        description,
        category,
        structure,
        is_active,
        version,
        usage_count,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        org_id,
        'Earthworks',
        'Earthworks and compaction inspection template',
        'Earthworks',
        '{
            "sections": [
                {
                    "id": "section-1",
                    "title": "Compaction Testing",
                    "description": "Soil compaction verification",
                    "items": [
                        {
                            "id": "item-1",
                            "type": "number",
                            "label": "Compaction percentage (%)",
                            "required": true,
                            "min": 90,
                            "max": 100
                        },
                        {
                            "id": "item-2",
                            "type": "select",
                            "label": "Test method",
                            "required": true,
                            "options": ["Sand replacement", "Nuclear densometer", "Core cutter"]
                        },
                        {
                            "id": "item-3",
                            "type": "checkbox",
                            "label": "Moisture content within specification",
                            "required": true
                        }
                    ]
                }
            ]
        }'::jsonb,
        true,
        1,
        0,
        user_id,
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Successfully created 3 basic ITP templates';
END $$;