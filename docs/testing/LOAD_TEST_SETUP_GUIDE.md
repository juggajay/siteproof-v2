# Load Test Setup Guide

Complete guide to set up and run load tests for SiteProof v2.

---

## ✅ Prerequisites

### Required Tools
- **k6** - Load testing tool ([Install Guide](https://k6.io/docs/getting-started/installation/))
- **psql** - PostgreSQL client (for database setup)
- **curl** - For API testing

### Verify Installation
```bash
k6 version    # Should show v0.40.0 or higher
psql --version # Should show PostgreSQL client
curl --version # Should show curl
```

---

## 📋 Setup Checklist

### Step 1: Verify Test Users Exist ✅

**Good news:** Test users already exist!

Run this to verify:
```bash
./scripts/test-login.sh
```

**Expected output:**
```
✓ Supabase Auth login SUCCESSFUL!
```

**Test User Credentials:**
- test1@siteproof.com | Test123!@#
- test2@siteproof.com | Test123!@#
- test3@siteproof.com | Test123!@#
- test4@siteproof.com | Test123!@#
- test5@siteproof.com | Test123!@#

### Step 2: Create Test Organizations

**Run this SQL script to create test organizations:**

```bash
# Option 1: Using psql directly (if you have DB credentials)
psql $DATABASE_URL -f scripts/create-test-organizations.sql

# Option 2: Using Supabase CLI
supabase db execute < scripts/create-test-organizations.sql

# Option 3: Run in Supabase Dashboard SQL Editor
# Copy contents of scripts/create-test-organizations.sql and run it
```

**What this creates:**
- 3 test organizations with specific UUIDs
- Links all test users to all test organizations as admins
- Ensures test users have permission to create projects

**Verify organizations were created:**
```sql
SELECT id, name, slug FROM organizations
WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);
```

**Expected result:**
```
id                                   | name                 | slug
-------------------------------------|----------------------|-------------
00000000-0000-0000-0000-000000000001 | Test Organization 1  | test-org-1
00000000-0000-0000-0000-000000000002 | Test Organization 2  | test-org-2
00000000-0000-0000-0000-000000000003 | Test Organization 3  | test-org-3
```

### Step 3: Start Development Server

**Terminal 1 - Start the app:**
```bash
cd /home/jayso/projects/siteproof-v2
pnpm dev
```

**Wait for:**
```
✓ Ready on http://localhost:3000
```

**Verify server is running:**
```bash
curl http://localhost:3000/api/health
```

**Expected:** `{"status":"healthy"}`

---

## 🧪 Running Load Tests

### Test 1: Basic Load Test (Unauthenticated)

**What it tests:**
- Health endpoints
- Unauthenticated API responses
- Server stability under load

**Run:**
```bash
cd /home/jayso/projects/siteproof-v2
k6 run tests/load-test.js
```

**Duration:** ~5 minutes
**Max concurrent users:** 50

**Success criteria:**
- ✅ p95 response time < 500ms
- ✅ Error rate < 5%
- ✅ Server uptime 100%

---

### Test 2: Authenticated Flow Test ⭐ (FIXED)

**What it tests:**
- User login with proper session management
- Dashboard loading
- Project creation
- Dashboard widgets
- Project listing
- User profile

**Run:**
```bash
cd /home/jayso/projects/siteproof-v2
k6 run tests/load-test-authenticated.js
```

**Duration:** ~14 minutes
**Max concurrent users:** 20

**What was fixed:**
- ✅ Now uses Next.js `/api/auth/login` endpoint (not direct Supabase)
- ✅ Proper cookie jar for session management
- ✅ Unique user IDs to prevent rate limiting collisions
- ✅ Correct organizationId extraction from user data

**Success criteria:**
- ✅ Login success rate > 95%
- ✅ Dashboard loads with proper data structure
- ✅ Project creation success rate > 90%
- ✅ All widgets load successfully
- ✅ Authentication maintained throughout test

---

### Test 3: Database Writes Test ⭐ (FIXED)

**What it tests:**
- Concurrent project creation
- Contractor creation
- Material creation
- NCR creation
- NCR status updates via workflow endpoints
- Bulk photo uploads

**Run:**
```bash
cd /home/jayso/projects/siteproof-v2
k6 run tests/load-test-database-writes.js
```

**Duration:** ~8 minutes
**Max concurrent users:** 30

**What was fixed:**
- ✅ Uses valid UUID organization IDs (not `test-org-1`)
- ✅ NCR updates use POST to `/ncrs/[id]/start_work` (not PATCH)
- ✅ Uses created NCR ID instead of hardcoded value
- ✅ Updated expected status codes

**Success criteria:**
- ✅ Write success rate > 70%
- ✅ Update success rate > 70%
- ✅ p95 latency < 2000ms
- ✅ Write conflicts < 50
- ✅ No transaction errors

---

### Test 4: Comprehensive Test Suite

**Run all tests sequentially:**
```bash
cd /home/jayso/projects/siteproof-v2
./tests/run-comprehensive-tests.sh
```

**This will run:**
1. Basic load test
2. Authenticated flow test
3. Database writes test

**Total duration:** ~30 minutes

**Results saved to:**
- `tests/comprehensive-test-results/`
- `tests/load-test-results/`

---

## 📊 Understanding Test Results

### Key Metrics to Watch

#### Response Times
```
✅ GOOD:  p95 < 500ms
⚠️ OK:    p95 500ms - 1000ms
❌ BAD:   p95 > 1000ms
```

#### Error Rates
```
✅ GOOD:  < 5%
⚠️ OK:    5% - 10%
❌ BAD:   > 10%
```

#### Throughput
```
✅ GOOD:  > 10 req/s
⚠️ OK:    5 - 10 req/s
❌ BAD:   < 5 req/s
```

### Common Issues and Solutions

#### Issue: Login Failures (401 errors)
**Cause:** Test users don't exist or wrong credentials
**Fix:**
```bash
./scripts/create-test-users-admin-api.sh
```

#### Issue: Project Creation Fails (400 Bad Request)
**Cause:** Test organizations don't exist
**Fix:**
```bash
psql $DATABASE_URL -f scripts/create-test-organizations.sql
```

#### Issue: Project Creation Fails (403 Forbidden)
**Cause:** Test users not members of test organizations
**Fix:** Re-run organization setup script (includes membership creation)

#### Issue: Rate Limiting (429 errors)
**Cause:** Too many requests from same IP
**Solution:** This is expected behavior. The test includes `x-test-user-id` header to mitigate this.

#### Issue: Connection Refused
**Cause:** Dev server not running
**Fix:**
```bash
pnpm dev
```

---

## 🎯 Expected Results After Fixes

### Before Fixes
```
Overall Success:      49%
Project Creation:     0% ❌
NCR Updates:          0% ❌
Dashboard Data:       0% ❌
Authentication:      73% ⚠️
```

### After Fixes (Expected)
```
Overall Success:     95%+ ✅
Project Creation:    95%+ ✅
NCR Updates:         95%+ ✅
Dashboard Data:     100%  ✅
Authentication:      98%+ ✅
```

---

## 🔍 Troubleshooting

### Check Database Connection
```bash
psql $DATABASE_URL -c "SELECT 1"
```

### Check If Test Users Exist
```bash
psql $DATABASE_URL -c "SELECT email FROM auth.users WHERE email LIKE 'test%@siteproof.com'"
```

### Check If Test Organizations Exist
```bash
psql $DATABASE_URL -c "SELECT id, name FROM organizations WHERE id::text LIKE '00000000-0000-0000-0000-%'"
```

### Check Organization Memberships
```bash
psql $DATABASE_URL -c "
SELECT
  o.name as org,
  u.email as user,
  om.role
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id
JOIN auth.users u ON om.user_id = u.id
WHERE o.id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
)
ORDER BY o.name, u.email;
"
```

### View k6 Test Logs
```bash
# Run with verbose output
k6 run --verbose tests/load-test-authenticated.js
```

### Check Server Logs
```bash
# In terminal where pnpm dev is running
# Watch for error messages during test execution
```

---

## 📁 Generated Files

After running tests, you'll find:

```
tests/
├── load-test-results/
│   ├── summary.json
│   ├── summary-with-auth.json
│   ├── results.json
│   └── results-with-auth.json
├── comprehensive-test-results/
│   ├── basic-load-{timestamp}.json
│   ├── auth-flow-{timestamp}.json
│   └── db-writes-{timestamp}.json
└── playwright-report/    (if e2e tests run)
```

---

## 🚀 Next Steps After Testing

### If Tests Pass (95%+ success)
1. ✅ All fixes are validated
2. ✅ Ready for production deployment
3. ✅ Monitor production metrics
4. ✅ Set up performance monitoring (APM)

### If Tests Still Fail
1. Check this guide's troubleshooting section
2. Review test output for specific error messages
3. Check server logs for errors
4. Verify all setup steps completed
5. Refer to `docs/testing/LOAD_TEST_FIXES_SUMMARY.md`

---

## 📞 Support

**Documentation:**
- Fix Summary: `docs/testing/LOAD_TEST_FIXES_SUMMARY.md`
- Test Scripts: `tests/load-test-*.js`
- Setup Scripts: `scripts/create-test-*.{sh,sql}`

**Common Commands:**
```bash
# Test login
./scripts/test-login.sh

# Create test users (if needed)
./scripts/create-test-users-admin-api.sh

# Create test organizations
psql $DATABASE_URL -f scripts/create-test-organizations.sql

# Run basic test
k6 run tests/load-test.js

# Run authenticated test
k6 run tests/load-test-authenticated.js

# Run database writes test
k6 run tests/load-test-database-writes.js

# Run all tests
./tests/run-comprehensive-tests.sh
```

---

**Last Updated:** October 10, 2025
**Status:** ✅ All fixes applied and documented
