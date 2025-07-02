-- Fix infinite recursion in organization_members policies
-- Drop the problematic policy
DROP POLICY IF EXISTS "System can insert members" ON organization_members;

-- Create a new policy that allows users to insert themselves as owners when creating an organization
CREATE POLICY "Users can create organization membership"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to add themselves as owner when no other members exist
    (
      user_id = auth.uid() 
      AND role = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = organization_members.organization_id
      )
    )
    OR
    -- Allow users to accept invitations (add themselves with invited role)
    (
      user_id = auth.uid()
      AND role != 'owner'
      AND EXISTS (
        SELECT 1 FROM invitations
        WHERE invitations.organization_id = organization_members.organization_id
        AND invitations.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND invitations.status = 'pending'
      )
    )
    OR
    -- Allow admins/owners to add members directly
    (
      auth.uid() IN (
        SELECT user_id FROM organization_members om
        WHERE om.organization_id = organization_members.organization_id
        AND om.role IN ('owner', 'admin')
      )
    )
  );

-- Also fix the select policy to avoid recursion
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;

CREATE POLICY "Members can view organization members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    -- Check if the current user is a member of the same organization
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );