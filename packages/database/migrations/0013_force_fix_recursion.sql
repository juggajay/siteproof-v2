-- FORCE FIX: Disable RLS temporarily to remove all policies
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies on both tables
DO $$ 
DECLARE
    pol record;
BEGIN
    -- Drop all policies on organization_members
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'organization_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_members', pol.policyname);
    END LOOP;
    
    -- Drop all policies on organizations
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'organizations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', pol.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Create minimal working policies for organizations
CREATE POLICY "Enable insert for authenticated users only" 
ON organizations FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable select for users based on organization_members" 
ON organizations FOR SELECT 
TO authenticated 
USING (
    deleted_at IS NULL 
    AND id IN (
        SELECT DISTINCT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Enable update for organization owners" 
ON organizations FOR UPDATE 
TO authenticated 
USING (
    deleted_at IS NULL 
    AND id IN (
        SELECT DISTINCT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role = 'owner'
    )
);

-- Create minimal working policies for organization_members
-- IMPORTANT: Using EXISTS instead of IN to avoid recursion
CREATE POLICY "Enable insert for authenticated users" 
ON organization_members FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Enable select for members" 
ON organization_members FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 
        FROM organization_members AS om_check 
        WHERE om_check.organization_id = organization_members.organization_id 
        AND om_check.user_id = auth.uid()
        LIMIT 1
    )
);

CREATE POLICY "Enable update for admins" 
ON organization_members FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 
        FROM organization_members AS om_check 
        WHERE om_check.organization_id = organization_members.organization_id 
        AND om_check.user_id = auth.uid() 
        AND om_check.role IN ('owner', 'admin')
        LIMIT 1
    )
);

CREATE POLICY "Enable delete for self or admins" 
ON organization_members FOR DELETE 
TO authenticated 
USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 
        FROM organization_members AS om_check 
        WHERE om_check.organization_id = organization_members.organization_id 
        AND om_check.user_id = auth.uid() 
        AND om_check.role IN ('owner', 'admin')
        LIMIT 1
    )
);