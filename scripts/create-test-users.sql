-- Create Test Users for Load Testing
-- Run this in your Supabase SQL Editor

-- These users are for testing purposes only
-- Email: test1@siteproof.com through test5@siteproof.com
-- Password: Test123!@#

-- User 1
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
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
  '{"full_name": "Test User 1"}',
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- User 2
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
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
  '{"full_name": "Test User 2"}',
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- User 3
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
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
  '{"full_name": "Test User 3"}',
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- User 4
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
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
  '{"full_name": "Test User 4"}',
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- User 5
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
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
  '{"full_name": "Test User 5"}',
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Verify users were created
SELECT email, created_at, email_confirmed_at
FROM auth.users
WHERE email LIKE 'test%@siteproof.com'
ORDER BY email;
