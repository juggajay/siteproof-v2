-- After confirming the app works, run this to implement proper security

-- Drop the temporary permissive policies
DROP POLICY IF EXISTS "org_insert" ON organizations;
DROP POLICY IF EXISTS "org_select" ON organizations;
DROP POLICY IF EXISTS "org_update" ON organizations;
DROP POLICY IF EXISTS "org_delete" ON organizations;
DROP POLICY IF EXISTS "members_insert" ON organization_members;
DROP POLICY IF EXISTS "members_select" ON organization_members;
DROP POLICY IF EXISTS "members_update" ON organization_members;
DROP POLICY IF EXISTS "members_delete" ON organization_members;

-- ORGANIZATIONS POLICIES - SECURE VERSION

-- Anyone can create an organization
CREATE POLICY "authenticated_users_can_create_orgs" 
ON organizations FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Users can only see organizations they belong to
CREATE POLICY "users_view_own_orgs" 
ON organizations FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
    )
    AND deleted_at IS NULL
);

-- Only owners can update their organization
CREATE POLICY "owners_update_orgs" 
ON organizations FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
);

-- Only owners can delete their organization
CREATE POLICY "owners_delete_orgs" 
ON organizations FOR DELETE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
);

-- ORGANIZATION_MEMBERS POLICIES - SECURE VERSION

-- Users can add themselves (for org creation & invitations)
CREATE POLICY "users_insert_self" 
ON organization_members FOR INSERT 
TO authenticated 
WITH CHECK (
    user_id = auth.uid()
    OR
    -- Admins/owners can add others
    EXISTS (
        SELECT 1 FROM organization_members existing_om
        WHERE existing_om.organization_id = organization_members.organization_id
        AND existing_om.user_id = auth.uid()
        AND existing_om.role IN ('owner', 'admin')
    )
);

-- Users can view members of their organizations
CREATE POLICY "members_view_same_org" 
ON organization_members FOR SELECT 
TO authenticated 
USING (
    organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om
        WHERE om.user_id = auth.uid()
    )
);

-- Only admins/owners can update member roles
CREATE POLICY "admins_update_members" 
ON organization_members FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM organization_members admin_om
        WHERE admin_om.organization_id = organization_members.organization_id
        AND admin_om.user_id = auth.uid()
        AND admin_om.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members admin_om
        WHERE admin_om.organization_id = organization_members.organization_id
        AND admin_om.user_id = auth.uid()
        AND admin_om.role IN ('owner', 'admin')
    )
);

-- Users can remove themselves, admins/owners can remove others
CREATE POLICY "members_delete_self_or_by_admin" 
ON organization_members FOR DELETE 
TO authenticated 
USING (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM organization_members admin_om
        WHERE admin_om.organization_id = organization_members.organization_id
        AND admin_om.user_id = auth.uid()
        AND admin_om.role IN ('owner', 'admin')
    )
);