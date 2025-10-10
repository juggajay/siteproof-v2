-- Supabase-Compatible Test User Creation
-- This uses Supabase's auth.admin API functions for proper user creation

-- First, check if users already exist
SELECT email FROM auth.users WHERE email LIKE 'test%@siteproof.com';

-- If you see existing users, delete them first (optional):
-- DELETE FROM auth.users WHERE email LIKE 'test%@siteproof.com';

-- Method 1: Using Supabase Admin Functions (RECOMMENDED)
-- Note: You may need to create these users via Supabase Dashboard instead
-- as direct SQL insertion into auth.users can cause issues

-- Alternative: Create via Dashboard
-- Go to: Authentication -> Users -> Add User
-- Then use these credentials:

/*
User 1: test1@siteproof.com | Test123!@#
User 2: test2@siteproof.com | Test123!@#
User 3: test3@siteproof.com | Test123!@#
User 4: test4@siteproof.com | Test123!@#
User 5: test5@siteproof.com | Test123!@#

Check "Auto Confirm User" for each
*/

-- Method 2: If your Supabase instance has the admin functions available:
-- (This might not work on all Supabase projects)

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create test user 1
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'test1@siteproof.com';
  IF new_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      created_at,
      updated_at,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'test1@siteproof.com',
      crypt('Test123!@#', gen_salt('bf')),
      now(),
      now(),
      now(),
      now(),
      '{"full_name": "Test User 1"}'::jsonb,
      false,
      '',
      '',
      '',
      ''
    );
    RAISE NOTICE 'Created test1@siteproof.com';
  ELSE
    RAISE NOTICE 'test1@siteproof.com already exists';
  END IF;

  -- Create test user 2
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'test2@siteproof.com';
  IF new_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      created_at,
      updated_at,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'test2@siteproof.com',
      crypt('Test123!@#', gen_salt('bf')),
      now(),
      now(),
      now(),
      now(),
      '{"full_name": "Test User 2"}'::jsonb,
      false,
      '',
      '',
      '',
      ''
    );
    RAISE NOTICE 'Created test2@siteproof.com';
  ELSE
    RAISE NOTICE 'test2@siteproof.com already exists';
  END IF;

  -- Create test user 3
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'test3@siteproof.com';
  IF new_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      created_at,
      updated_at,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'test3@siteproof.com',
      crypt('Test123!@#', gen_salt('bf')),
      now(),
      now(),
      now(),
      now(),
      '{"full_name": "Test User 3"}'::jsonb,
      false,
      '',
      '',
      '',
      ''
    );
    RAISE NOTICE 'Created test3@siteproof.com';
  ELSE
    RAISE NOTICE 'test3@siteproof.com already exists';
  END IF;

  -- Create test user 4
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'test4@siteproof.com';
  IF new_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      created_at,
      updated_at,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'test4@siteproof.com',
      crypt('Test123!@#', gen_salt('bf')),
      now(),
      now(),
      now(),
      now(),
      '{"full_name": "Test User 4"}'::jsonb,
      false,
      '',
      '',
      '',
      ''
    );
    RAISE NOTICE 'Created test4@siteproof.com';
  ELSE
    RAISE NOTICE 'test4@siteproof.com already exists';
  END IF;

  -- Create test user 5
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'test5@siteproof.com';
  IF new_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      created_at,
      updated_at,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'test5@siteproof.com',
      crypt('Test123!@#', gen_salt('bf')),
      now(),
      now(),
      now(),
      now(),
      '{"full_name": "Test User 5"}'::jsonb,
      false,
      '',
      '',
      '',
      ''
    );
    RAISE NOTICE 'Created test5@siteproof.com';
  ELSE
    RAISE NOTICE 'test5@siteproof.com already exists';
  END IF;
END $$;

-- Verify users were created
SELECT
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data->>'full_name' as full_name
FROM auth.users
WHERE email LIKE 'test%@siteproof.com'
ORDER BY email;
