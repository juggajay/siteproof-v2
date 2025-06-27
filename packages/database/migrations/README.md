# Database Migrations

This directory contains SQL migrations for the SiteProof database schema.

## Running Migrations

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run each migration file in order:
   - `0001_auth_schema.sql` - Creates the core tables
   - `0002_auth_rls_policies.sql` - Sets up Row Level Security

## Schema Overview

### Tables

- **organizations**: Companies/teams using the platform
- **users**: User profiles (extends Supabase auth.users)
- **organization_members**: Junction table for user-organization relationships
- **invitations**: Pending invitations to join organizations

### Security Model

- All tables have Row Level Security (RLS) enabled
- Users can only see data from organizations they belong to
- Role-based permissions: owner > admin > member > viewer
- Automatic user profile creation on signup

### Key Features

1. **Multi-tenancy**: Complete data isolation between organizations
2. **Flexible roles**: 4-tier permission system
3. **Invitation system**: Secure token-based invitations
4. **Soft deletes**: Data preservation for compliance
5. **Audit trail**: Timestamps and user tracking

### Helper Functions

- `is_organization_member()`: Check membership
- `get_user_role()`: Get user's role in organization
- `has_permission()`: Check specific permissions
- `create_organization_with_owner()`: Atomic organization creation
- `accept_invitation()`: Process invitation acceptance

## Testing

After running migrations, test with:

```sql
-- Create a test organization
SELECT create_organization_with_owner('Test Org', 'test-org');

-- Check RLS policies
SELECT * FROM organizations; -- Should only see your organizations
```