-- Debug script to understand lot 404 issues

-- 1. Check a specific lot and its relationships
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

-- 2. Check all lots and their relationships
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
ORDER BY l.created_at DESC
LIMIT 10;

-- 3. Check if projects exist
SELECT id, name, organization_id 
FROM projects 
WHERE id IN ('217523b8-6dd7-4d94-b876-e41879d07970', '89253127-a60a-48a7-a511-ce89c316d3af');

-- 4. Check organizations
SELECT id, name FROM organizations LIMIT 5;