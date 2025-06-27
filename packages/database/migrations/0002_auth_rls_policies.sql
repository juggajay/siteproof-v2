-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ORGANIZATIONS POLICIES
-- ============================================

-- Users can view organizations they are members of
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Only organization owners can update their organization
CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
    AND deleted_at IS NULL
  );

-- Any authenticated user can create an organization
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only owners can soft delete organizations
CREATE POLICY "Owners can delete their organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  );

-- ============================================
-- USERS POLICIES
-- ============================================

-- Users can view other users in their organizations
CREATE POLICY "Users can view organization members"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- Can always see yourself
    id = auth.uid()
    OR
    -- Can see users in same organizations
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om2.user_id = users.id
    )
  );

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users are automatically created via trigger, no manual insert needed
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================
-- ORGANIZATION_MEMBERS POLICIES
-- ============================================

-- Members can view all members in their organizations
CREATE POLICY "Members can view organization members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Only owners and admins can add members (via invitation acceptance)
CREATE POLICY "System can insert members"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User accepting their own invitation
    user_id = auth.uid()
    OR
    -- Owner/admin adding members
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organization_members.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Only owners and admins can update member roles
CREATE POLICY "Admins can update member roles"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    -- Cannot change last owner
    NOT (
      role = 'owner' 
      AND NOT EXISTS (
        SELECT 1 FROM organization_members om2
        WHERE om2.organization_id = organization_members.organization_id
        AND om2.id != organization_members.id
        AND om2.role = 'owner'
      )
    )
    AND
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Members can remove themselves, owners/admins can remove others
CREATE POLICY "Members can leave, admins can remove"
  ON organization_members FOR DELETE
  TO authenticated
  USING (
    -- User removing themselves
    user_id = auth.uid()
    OR
    -- Admin/owner removing others
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- INVITATIONS POLICIES
-- ============================================

-- Members can view invitations for their organizations
CREATE POLICY "Members can view organization invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    -- Can see invitations for organizations you're in
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = invitations.organization_id
      AND organization_members.user_id = auth.uid()
    )
    OR
    -- Can see invitations sent to your email
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Only admins and owners can create invitations
CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
    AND invited_by = auth.uid()
  );

-- Admins can update (cancel) invitations, users can accept their own
CREATE POLICY "Manage invitations"
  ON invitations FOR UPDATE
  TO authenticated
  USING (
    -- Admin cancelling invitation
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
    OR
    -- User accepting their own invitation
    (
      email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND status = 'pending'
    )
  )
  WITH CHECK (
    -- Can only transition from pending to accepted/cancelled
    (
      status = 'pending' 
      AND NEW.status IN ('accepted', 'cancelled')
    )
    OR
    -- Or update accepted_at/accepted_by when accepting
    (
      status = 'accepted' 
      AND NEW.accepted_by = auth.uid()
      AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Only admins can delete invitations
CREATE POLICY "Admins can delete invitations"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to create organization with owner
CREATE OR REPLACE FUNCTION create_organization_with_owner(
  org_name VARCHAR,
  org_slug VARCHAR,
  owner_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
  actual_owner_id UUID;
BEGIN
  -- Use provided owner_id or current user
  actual_owner_id := COALESCE(owner_id, auth.uid());
  
  -- Insert organization
  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;
  
  -- Add creator as owner
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, actual_owner_id, 'owner');
  
  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  inv RECORD;
  current_user_email VARCHAR;
BEGIN
  -- Get current user email
  SELECT email INTO current_user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Find valid invitation
  SELECT * INTO inv
  FROM invitations
  WHERE token = invitation_token
  AND status = 'pending'
  AND expires_at > NOW()
  AND email = current_user_email;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update invitation
  UPDATE invitations
  SET 
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = auth.uid()
  WHERE id = inv.id;
  
  -- Add user to organization
  INSERT INTO organization_members (organization_id, user_id, role, invited_by)
  VALUES (inv.organization_id, auth.uid(), inv.role, inv.invited_by)
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;