-- Comprehensive Lot Debug Script
-- Run this in Supabase SQL editor to diagnose lot 404 issues

-- 1. List all lots with their relationships
SELECT 
    l.id as lot_id,
    l.lot_number,
    l.name as lot_name,
    l.project_id,
    l.status,
    l.created_at,
    p.id as project_id_check,
    p.name as project_name,
    p.organization_id,
    o.name as organization_name,
    CASE 
        WHEN p.id IS NULL THEN '❌ NO PROJECT'
        WHEN o.id IS NULL THEN '❌ NO ORGANIZATION'
        ELSE '✅ OK'
    END as data_status
FROM lots l
LEFT JOIN projects p ON l.project_id = p.id
LEFT JOIN organizations o ON p.organization_id = o.id
ORDER BY l.created_at DESC
LIMIT 20;

-- 2. Check for orphaned lots (lots without valid projects)
SELECT COUNT(*) as orphaned_lots_count
FROM lots l
LEFT JOIN projects p ON l.project_id = p.id
WHERE p.id IS NULL;

-- 3. Check your user's organization memberships
-- Replace 'your-email@example.com' with your actual email
SELECT 
    u.email,
    u.id as user_id,
    om.organization_id,
    om.role,
    o.name as organization_name
FROM users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'your-email@example.com';

-- 4. Find lots you should have access to
-- Replace 'your-email@example.com' with your actual email
WITH user_orgs AS (
    SELECT om.organization_id
    FROM users u
    JOIN organization_members om ON u.id = om.user_id
    WHERE u.email = 'your-email@example.com'
)
SELECT 
    l.id as lot_id,
    l.lot_number,
    l.name as lot_name,
    l.project_id,
    p.name as project_name,
    p.organization_id,
    o.name as organization_name,
    'You have access' as access_status
FROM lots l
JOIN projects p ON l.project_id = p.id
JOIN organizations o ON p.organization_id = o.id
WHERE p.organization_id IN (SELECT organization_id FROM user_orgs)
ORDER BY l.created_at DESC;

-- 5. Check a specific lot by ID
-- Replace 'your-lot-id' with the actual lot ID that's giving 404
SELECT 
    l.*,
    p.name as project_name,
    p.organization_id,
    o.name as organization_name,
    (
        SELECT COUNT(*)
        FROM organization_members om
        WHERE om.organization_id = p.organization_id
    ) as total_members
FROM lots l
LEFT JOIN projects p ON l.project_id = p.id
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE l.id = 'your-lot-id';

-- 6. Check for ITP instances
SELECT 
    COUNT(*) as total_itp_instances,
    COUNT(DISTINCT lot_id) as lots_with_itps,
    COUNT(DISTINCT template_id) as unique_templates_used
FROM itp_instances;

-- 7. Recent activity check
SELECT 
    'Lots' as entity,
    COUNT(*) as count,
    MAX(created_at) as last_created
FROM lots
UNION ALL
SELECT 
    'Projects' as entity,
    COUNT(*) as count,
    MAX(created_at) as last_created
FROM projects
UNION ALL
SELECT 
    'ITP Instances' as entity,
    COUNT(*) as count,
    MAX(created_at) as last_created
FROM itp_instances;