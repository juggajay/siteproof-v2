-- Debug script to understand lot 404 issues

-- 1. Check a specific lot
SELECT 
    l.id as lot_id,
    l.lot_number,
    l.name as lot_name,
    l.project_id,
    p.id as project_id_from_join,
    p.name as project_name,
    p.organization_id,
    o.name as organization_name
FROM lots l
LEFT JOIN projects p ON l.project_id = p.id
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE l.id = 'c295c0f2-8a98-4f4d-b687-c55e2195aa97';

-- 2. Check if the user has access to the organization
SELECT 
    om.user_id,
    om.organization_id,
    om.role,
    u.email,
    o.name as organization_name
FROM organization_members om
JOIN users u ON om.user_id = u.id
JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'YOUR_EMAIL_HERE'; -- Replace with your email

-- 3. Check all lots and their relationships
SELECT 
    l.id,
    l.lot_number,
    l.name,
    l.project_id,
    p.name as project_name,
    p.organization_id,
    CASE 
        WHEN p.id IS NULL THEN 'NO PROJECT FOUND'
        WHEN p.organization_id IS NULL THEN 'PROJECT HAS NO ORG'
        ELSE 'OK'
    END as status
FROM lots l
LEFT JOIN projects p ON l.project_id = p.id
ORDER BY l.created_at DESC;

-- 4. Check if there are any ITP instances
SELECT COUNT(*) as itp_instance_count FROM itp_instances;

-- 5. Check if itp_instances table has the correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'itp_instances'
ORDER BY ordinal_position;