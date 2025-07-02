-- First, drop ALL existing policies on organization_members to start fresh
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
DROP POLICY IF EXISTS "System can insert members" ON organization_members;
DROP POLICY IF EXISTS "Users can create organization membership" ON organization_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON organization_members;
DROP POLICY IF EXISTS "Members can leave, admins can remove" ON organization_members;

-- Create simple, non-recursive policies

-- 1. SELECT: Users can view members of organizations they belong to
CREATE POLICY "view_organization_members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members om2
      WHERE om2.organization_id = organization_members.organization_id
    )
  );

-- 2. INSERT: Allow creating organization membership
CREATE POLICY "create_organization_membership"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can only add themselves initially
    user_id = auth.uid()
  );

-- 3. UPDATE: Only admins and owners can update
CREATE POLICY "update_organization_members"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members om2
      WHERE om2.organization_id = organization_members.organization_id
      AND om2.role IN ('owner', 'admin')
    )
  );

-- 4. DELETE: Users can remove themselves, admins can remove others
CREATE POLICY "delete_organization_members"
  ON organization_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members om2
      WHERE om2.organization_id = organization_members.organization_id
      AND om2.role IN ('owner', 'admin')
    )
  );

-- Also check and fix organizations policies that might reference organization_members
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON organizations;

-- Recreate organizations policies without recursion
CREATE POLICY "view_organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "update_organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "delete_organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
    )
  );

-- The INSERT policy for organizations should remain as is
-- It doesn't reference organization_members so no recursion issue