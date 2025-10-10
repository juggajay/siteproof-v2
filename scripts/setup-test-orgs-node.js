#!/usr/bin/env node

/**
 * Setup Test Organizations using Supabase Client
 * This creates test organizations and links test users as admins
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://slzmbpntjoaltasfxiiv.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsem1icG50am9hbHRhc2Z4aWl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA0NjM3NiwiZXhwIjoyMDY2NjIyMzc2fQ.i6G2wbQJJFdq-ePZn3yvNwIXFqAfQLA8Stu_1YYVcNM';

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const TEST_ORGS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Test Organization 1',
    slug: 'test-org-1',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Test Organization 2',
    slug: 'test-org-2',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Test Organization 3',
    slug: 'test-org-3',
  },
];

async function setupTestOrganizations() {
  console.log('=========================================');
  console.log('Setting Up Test Organizations');
  console.log('=========================================');
  console.log('');

  try {
    // Step 1: Create organizations
    console.log('Step 1: Creating test organizations...');
    console.log('');

    for (const org of TEST_ORGS) {
      const { data, error } = await supabase
        .from('organizations')
        .upsert(org, { onConflict: 'id' })
        .select();

      if (error) {
        console.log(`  ⚠ Error creating ${org.name}:`, error.message);
      } else {
        console.log(`  ✓ ${org.name} created/updated`);
      }
    }

    console.log('');
    console.log('Step 2: Getting test users...');
    console.log('');

    // Step 2: Get all test users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('  ✗ Error fetching users:', usersError.message);
      return;
    }

    const testUsers = users.users.filter((u) => u.email?.startsWith('test') && u.email.endsWith('@siteproof.com'));

    if (testUsers.length === 0) {
      console.log('  ⚠ No test users found!');
      console.log('  Run: ./scripts/create-test-users-admin-api.sh first');
      return;
    }

    console.log(`  Found ${testUsers.length} test users:`);
    testUsers.forEach((u) => console.log(`    - ${u.email} (${u.id})`));

    console.log('');
    console.log('Step 3: Creating organization memberships...');
    console.log('');

    // Step 3: Create memberships (each user in each org as admin)
    let successCount = 0;
    let errorCount = 0;

    for (const org of TEST_ORGS) {
      for (const user of testUsers) {
        const { error } = await supabase.from('organization_members').upsert(
          {
            organization_id: org.id,
            user_id: user.id,
            role: 'admin',
          },
          { onConflict: 'organization_id,user_id' }
        );

        if (error) {
          console.log(`  ✗ Error linking ${user.email} to ${org.name}:`, error.message);
          errorCount++;
        } else {
          successCount++;
        }
      }
    }

    console.log(`  ✓ Created ${successCount} memberships`);
    if (errorCount > 0) {
      console.log(`  ⚠ ${errorCount} errors occurred`);
    }

    console.log('');
    console.log('Step 4: Verifying setup...');
    console.log('');

    // Step 4: Verify setup
    for (const org of TEST_ORGS) {
      const { data: members, error } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', org.id);

      if (error) {
        console.log(`  ⚠ ${org.name}: Error verifying`);
      } else {
        console.log(`  ✓ ${org.name}: ${members?.length || 0} members`);
      }
    }

    console.log('');
    console.log('=========================================');
    console.log('✅ Setup Complete!');
    console.log('=========================================');
    console.log('');
    console.log('Test organizations ready:');
    TEST_ORGS.forEach((org) => {
      console.log(`  - ${org.id}`);
      console.log(`    Name: ${org.name}`);
      console.log(`    Slug: ${org.slug}`);
      console.log('');
    });
    console.log('All test users have admin access to all test organizations.');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Start dev server: pnpm dev');
    console.log('  2. Run tests: k6 run tests/load-test-authenticated.js');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('✗ Unexpected error:', error);
    console.error('');
    process.exit(1);
  }
}

// Run setup
setupTestOrganizations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
