-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Billing and plan information
  plan_type VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'active',
  subscription_ends_at TIMESTAMPTZ,
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Create index for slug lookups
CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_created_at ON organizations(created_at);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- User preferences
  preferences JSONB DEFAULT '{}',
  
  -- Last seen for activity tracking
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Create indexes for user lookups
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);

-- Organization members junction table
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Role can be: owner, admin, member, viewer
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  
  -- Permissions as JSONB for flexibility
  permissions JSONB DEFAULT '{}',
  
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- For tracking who invited this member
  invited_by UUID REFERENCES users(id),
  
  -- Unique constraint to prevent duplicate memberships
  CONSTRAINT unique_org_member UNIQUE(organization_id, user_id)
);

-- Create indexes for member lookups
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(role);

-- Invitations table
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Email of the invited user
  email VARCHAR(255) NOT NULL,
  
  -- Role to assign when invitation is accepted
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  
  -- Invitation token (should be unique and secure)
  token VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Who sent the invitation
  invited_by UUID NOT NULL REFERENCES users(id),
  
  -- Invitation lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id),
  
  -- Status: pending, accepted, expired, cancelled
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  -- Prevent duplicate active invitations
  CONSTRAINT unique_active_invitation UNIQUE(organization_id, email, status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for invitation lookups
CREATE INDEX idx_invitations_org_id ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token) WHERE status = 'pending';
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at) WHERE status = 'pending';

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers for tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update user last_seen_at
CREATE OR REPLACE FUNCTION update_user_last_seen(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET last_seen_at = NOW() WHERE id = user_id;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to check if user is organization member
CREATE OR REPLACE FUNCTION is_organization_member(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id 
    AND organization_members.user_id = user_id
  );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to check user role in organization
CREATE OR REPLACE FUNCTION get_user_role(org_id UUID, user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT role INTO user_role
  FROM organization_members
  WHERE organization_id = org_id
  AND organization_members.user_id = user_id;
  
  RETURN user_role;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(org_id UUID, user_id UUID, permission VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
  user_permissions JSONB;
BEGIN
  SELECT role, permissions INTO user_role, user_permissions
  FROM organization_members
  WHERE organization_id = org_id
  AND organization_members.user_id = user_id;
  
  -- Owners have all permissions
  IF user_role = 'owner' THEN
    RETURN TRUE;
  END IF;
  
  -- Admins have most permissions (customize as needed)
  IF user_role = 'admin' AND permission != 'delete_organization' THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific permissions in JSONB
  IF user_permissions ? permission THEN
    RETURN (user_permissions ->> permission)::BOOLEAN;
  END IF;
  
  -- Default permissions based on role
  CASE user_role
    WHEN 'member' THEN
      RETURN permission IN ('view_projects', 'create_projects', 'edit_own_projects');
    WHEN 'viewer' THEN
      RETURN permission = 'view_projects';
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ language 'plpgsql' SECURITY DEFINER;