-- Disable RLS temporarily
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON organizations;
DROP POLICY IF EXISTS "Enable select for users based on organization_members" ON organizations;
DROP POLICY IF EXISTS "Enable update for organization owners" ON organizations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON organization_members;
DROP POLICY IF EXISTS "Enable select for members" ON organization_members;
DROP POLICY IF EXISTS "Enable update for admins" ON organization_members;
DROP POLICY IF EXISTS "Enable delete for self or admins" ON organization_members;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON organizations;
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
DROP POLICY IF EXISTS "System can insert members" ON organization_members;
DROP POLICY IF EXISTS "Users can create organization membership" ON organization_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON organization_members;
DROP POLICY IF EXISTS "Members can leave, admins can remove" ON organization_members;
DROP POLICY IF EXISTS "view_organization_members" ON organization_members;
DROP POLICY IF EXISTS "create_organization_membership" ON organization_members;
DROP POLICY IF EXISTS "update_organization_members" ON organization_members;
DROP POLICY IF EXISTS "delete_organization_members" ON organization_members;
DROP POLICY IF EXISTS "view_organizations" ON organizations;
DROP POLICY IF EXISTS "update_organizations" ON organizations;
DROP POLICY IF EXISTS "delete_organizations" ON organizations;

-- Re-enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Super simple policies for organizations
CREATE POLICY "org_insert" ON organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "org_select" ON organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_update" ON organizations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "org_delete" ON organizations FOR DELETE TO authenticated USING (true);

-- Super simple policies for organization_members  
CREATE POLICY "members_insert" ON organization_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "members_select" ON organization_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "members_update" ON organization_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "members_delete" ON organization_members FOR DELETE TO authenticated USING (true);