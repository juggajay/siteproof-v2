# How to Create Test Users

The API signup encountered rate limiting. Here are 3 alternative methods to create test users:

---

## ✅ Method 1: Supabase Dashboard (Easiest)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **slzmbpntjoaltasfxiiv**
3. Navigate to **Authentication** → **Users**
4. Click **"Add User"** or **"Invite"**
5. Create 5 users with these details:

```
User 1:
  Email: test1@siteproof.com
  Password: Test123!@#
  Email Confirm: Yes (check the box)

User 2:
  Email: test2@siteproof.com
  Password: Test123!@#
  Email Confirm: Yes

User 3:
  Email: test3@siteproof.com
  Password: Test123!@#
  Email Confirm: Yes

User 4:
  Email: test4@siteproof.com
  Password: Test123!@#
  Email Confirm: Yes

User 5:
  Email: test5@siteproof.com
  Password: Test123!@#
  Email Confirm: Yes
```

**Estimated Time:** 5 minutes

---

## ✅ Method 2: SQL Script (Fastest)

1. Go to [Supabase Dashboard](https://app.supabase.com) → **SQL Editor**
2. Click **"New Query"**
3. Copy and paste the contents of: `scripts/create-test-users.sql`
4. Click **"Run"**
5. Verify 5 users were created

The SQL file is located at:
```
scripts/create-test-users.sql
```

**Estimated Time:** 2 minutes

---

## ✅ Method 3: Manual Signup (Most Realistic)

1. Open your browser to: http://localhost:3000
2. Click **"Sign Up"**
3. Fill in the form 5 times with these credentials:

```
User 1: test1@siteproof.com | Test123!@# | Test User 1
User 2: test2@siteproof.com | Test123!@# | Test User 2
User 3: test3@siteproof.com | Test123!@# | Test User 3
User 4: test4@siteproof.com | Test123!@# | Test User 4
User 5: test5@siteproof.com | Test123!@# | Test User 5
```

4. Check your email or Supabase dashboard to confirm each user

**Estimated Time:** 10 minutes

---

## ✅ Verify Test Users

After creating users, verify they can log in:

```bash
# Test login with user 1
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@siteproof.com",
    "password": "Test123!@#"
  }'
```

Expected response:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "test1@siteproof.com"
  }
}
```

---

## 🎯 Once Complete

After creating the test users, run the comprehensive test suite:

```bash
./tests/run-comprehensive-tests.sh
```

Or run the authenticated test directly:

```bash
k6 run tests/load-test-authenticated.js
```

---

## ⚠️ Note About API Rate Limiting

The signup API has rate limiting enabled:
- **5 signups per hour** per IP address
- This is a security feature to prevent abuse
- For testing, use the Supabase Dashboard or SQL method instead

---

**Recommended Method:** Use **Method 1 (Supabase Dashboard)** - it's the easiest and most reliable!
