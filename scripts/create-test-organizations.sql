-- Create Test Organizations for Load Testing
-- These organizations are used by the database writes load test

-- First, check if they exist and delete if needed (for clean setup)
DELETE FROM organization_members
WHERE organization_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

DELETE FROM organizations
WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

-- Create test organizations
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test Organization 1', 'test-org-1', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'Test Organization 2', 'test-org-2', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Test Organization 3', 'test-org-3', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  updated_at = NOW();

-- Add all test users to all test organizations as admins
-- This ensures any test user can create projects in any test organization

DO $$
DECLARE
  test_user RECORD;
  test_org_id UUID;
BEGIN
  -- For each test organization
  FOR test_org_id IN
    SELECT unnest(ARRAY[
      '00000000-0000-0000-0000-000000000001'::UUID,
      '00000000-0000-0000-0000-000000000002'::UUID,
      '00000000-0000-0000-0000-000000000003'::UUID
    ])
  LOOP
    -- Add each test user
    FOR test_user IN
      SELECT id FROM auth.users WHERE email LIKE 'test%@siteproof.com'
    LOOP
      INSERT INTO organization_members (organization_id, user_id, role, created_at, updated_at)
      VALUES (test_org_id, test_user.id, 'admin', NOW(), NOW())
      ON CONFLICT (organization_id, user_id) DO UPDATE SET
        role = 'admin',
        updated_at = NOW();
    END LOOP;
  END LOOP;
END $$;

-- Verify setup
SELECT
  o.id,
  o.name,
  o.slug,
  COUNT(om.user_id) as member_count
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
WHERE o.id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
)
GROUP BY o.id, o.name, o.slug
ORDER BY o.id;

-- Show which users are in which orgs
SELECT
  o.name as organization,
  u.email as user_email,
  om.role
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id
JOIN auth.users u ON om.user_id = u.id
WHERE o.id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
)
ORDER BY o.name, u.email;
