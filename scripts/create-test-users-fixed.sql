-- Create Test Users for Load Testing (Fixed for Supabase)
-- Run this in your Supabase SQL Editor

-- First, check if users exist and delete them if needed
DO $$
DECLARE
  user_count integer;
BEGIN
  -- Count existing test users
  SELECT COUNT(*) INTO user_count
  FROM auth.users
  WHERE email LIKE 'test%@siteproof.com';

  IF user_count > 0 THEN
    RAISE NOTICE 'Found % existing test users. Deleting them first...', user_count;
    DELETE FROM auth.users WHERE email LIKE 'test%@siteproof.com';
    RAISE NOTICE 'Deleted existing test users';
  END IF;
END $$;

-- Now create the 5 test users
DO $$
BEGIN
  -- User 1
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

  -- User 2
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

  -- User 3
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

  -- User 4
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

  -- User 5
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

  RAISE NOTICE 'Successfully created all 5 test users';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating test users: %', SQLERRM;
END $$;

-- Verify users were created
SELECT
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data->>'full_name' as full_name,
  aud,
  role
FROM auth.users
WHERE email LIKE 'test%@siteproof.com'
ORDER BY email;

-- Display summary
DO $$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM auth.users
  WHERE email LIKE 'test%@siteproof.com';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test User Creation Summary';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total test users created: %', user_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Credentials:';
  RAISE NOTICE 'test1@siteproof.com | Test123!@#';
  RAISE NOTICE 'test2@siteproof.com | Test123!@#';
  RAISE NOTICE 'test3@siteproof.com | Test123!@#';
  RAISE NOTICE 'test4@siteproof.com | Test123!@#';
  RAISE NOTICE 'test5@siteproof.com | Test123!@#';
  RAISE NOTICE '========================================';
END $$;
