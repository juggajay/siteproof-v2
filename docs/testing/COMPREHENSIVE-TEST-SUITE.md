# SiteProof v2 Comprehensive Test Suite

Complete testing solution for production readiness validation.

---

## 📋 Test Suite Overview

This comprehensive test suite includes 4 types of tests covering all critical aspects of the application:

| Test Type | File | Duration | Purpose |
|-----------|------|----------|---------|
| **Basic Load Test** | `tests/load-test.js` | 6 min | Baseline performance & health |
| **Authenticated Flow** | `tests/load-test-authenticated.js` | 14 min | Real user scenarios with auth |
| **Database Writes** | `tests/load-test-database-writes.js` | 8 min | Concurrent write operations |
| **E2E Critical Flows** | `tests/e2e/critical-user-flows.spec.ts` | 5-10 min | UI & user journey validation |

**Total Duration:** ~30-40 minutes for full suite

---

## 🚀 Quick Start

### Option 1: Run All Tests (Recommended)

```bash
./tests/run-comprehensive-tests.sh
```

This script runs all tests sequentially and generates a comprehensive report.

### Option 2: Run Individual Tests

```bash
# 1. Basic Load Test
k6 run tests/load-test.js

# 2. Authenticated User Flow Test
k6 run tests/load-test-authenticated.js

# 3. Database Write Operations Test
k6 run tests/load-test-database-writes.js

# 4. E2E Tests
pnpm --filter web playwright test tests/e2e/critical-user-flows.spec.ts
```

---

## 📊 Test 1: Basic Load Test

**File:** `tests/load-test.js`

### What It Tests
- Health check endpoint
- Unauthenticated API endpoints
- Static content delivery
- Basic server stability

### Load Pattern
```
30s  → 10 users
1m   → 20 users
2m   → 20 users (sustained)
1m   → 50 users (spike)
30s  → 10 users
30s  → 0 users
```

### Success Criteria
- ✅ p95 response time < 500ms
- ✅ p99 response time < 1000ms
- ✅ Error rate < 10%
- ✅ Server remains healthy

### Run Command
```bash
k6 run \
  --out json=tests/results/basic-load.json \
  --summary-export=tests/results/basic-load-summary.json \
  tests/load-test.js
```

---

## 🔐 Test 2: Authenticated User Flow Test

**File:** `tests/load-test-authenticated.js`

### What It Tests
- User login flow
- Dashboard loading with real data
- Project creation
- Dashboard widgets (summary, NCR, ITP)
- Project listing & browsing
- User profile access

### Prerequisites

**⚠️ IMPORTANT:** Create test users before running:

```sql
-- Create 5 test users in your database
INSERT INTO users (email, password_hash, ...) VALUES
  ('test1@siteproof.com', '$2a$10$...', ...),
  ('test2@siteproof.com', '$2a$10$...', ...),
  ('test3@siteproof.com', '$2a$10$...', ...),
  ('test4@siteproof.com', '$2a$10$...', ...),
  ('test5@siteproof.com', '$2a$10$...', ...);

-- All passwords: Test123!@#
```

### Load Pattern
```
1m   → 5 users
3m   → 10 users
5m   → 10 users (sustained)
2m   → 20 users (spike)
2m   → 5 users
1m   → 0 users
```

### Success Criteria
- ✅ Login success rate > 80%
- ✅ Project creation success > 70%
- ✅ Dashboard load time < 2s (p95)
- ✅ API response time < 1s (p95)

### Metrics Tracked
- `login_success` - Login success rate
- `project_creation_success` - Project creation rate
- `dashboard_load_time` - Dashboard performance
- `authenticated_api_response_time` - API latency
- `authentication_errors` - Auth failures

### Run Command
```bash
k6 run \
  --out json=tests/results/auth-flow.json \
  --summary-export=tests/results/auth-flow-summary.json \
  tests/load-test-authenticated.js
```

---

## 💾 Test 3: Database Write Operations Test

**File:** `tests/load-test-database-writes.js`

### What It Tests
- **Concurrent writes** - Multiple users creating data simultaneously
- **Project creation** - Database transactions under load
- **Contractor creation** - Write performance
- **Material creation** - Bulk inserts
- **NCR creation** - Complex writes with relationships
- **Updates** - Concurrent update operations
- **Bulk operations** - Photo upload simulation

### ⚠️ WARNING
This test **WRITES REAL DATA** to your database!

- Run only against dev/test environments
- Clean up test data after running
- Monitor database performance during test

### Load Pattern
```
30s  → 5 users
2m   → 15 users
3m   → 15 users (sustained writes)
1m   → 30 users (write spike)
1m   → 10 users
30s  → 0 users
```

### Success Criteria
- ✅ Write success rate > 70%
- ✅ Update success rate > 70%
- ✅ Write latency < 2s (p95)
- ✅ Write conflicts < 50
- ✅ Transaction errors minimal

### Metrics Tracked
- `database_write_success` - Successful writes
- `database_update_success` - Successful updates
- `write_operation_latency` - Write performance
- `concurrent_write_operations` - Write volume
- `write_conflicts` - Concurrent conflicts
- `transaction_errors` - Database errors

### Data Generated
Each test iteration creates:
- 1 Project
- 1 Contractor
- 1 Material
- 1 NCR (Non-Conformance Report)
- 1 Update operation
- 1 Bulk photo metadata record

**Cleanup Query:**
```sql
-- Clean up test data after running
DELETE FROM projects WHERE name LIKE 'LoadTest-Project-%';
DELETE FROM contractors WHERE email LIKE '%@loadtest.com';
DELETE FROM materials WHERE name LIKE 'Material-VU%';
DELETE FROM ncrs WHERE title LIKE 'NCR-VU%';
```

### Run Command
```bash
k6 run \
  --out json=tests/results/db-writes.json \
  --summary-export=tests/results/db-writes-summary.json \
  tests/load-test-database-writes.js
```

---

## 🎭 Test 4: End-to-End Critical User Flows

**File:** `tests/e2e/critical-user-flows.spec.ts`

### What It Tests

#### 1. Authentication Flow
- ✅ Login with valid credentials
- ✅ Login error handling
- ✅ Logout functionality

#### 2. Project Management
- ✅ Projects list loading
- ✅ Create project dialog
- ✅ Project details navigation

#### 3. Dashboard
- ✅ Dashboard widget loading
- ✅ Project summary widget
- ✅ Performance measurement

#### 4. ITP Management
- ✅ ITP section navigation
- ✅ ITP list loading

#### 5. Responsive Design
- ✅ Mobile viewport (375x667)
- ✅ Tablet viewport (768x1024)
- ✅ Mobile menu functionality

#### 6. Error Handling
- ✅ 404 page handling
- ✅ Network error handling

#### 7. Performance
- ✅ Page load times
- ✅ Console error monitoring

### Prerequisites

Create `.env.test` or export environment variables:

```bash
export TEST_USER_EMAIL="test@siteproof.com"
export TEST_USER_PASSWORD="Test123!@#"
export BASE_URL="http://localhost:3000"
```

### Run Commands

```bash
# Run all E2E tests
pnpm --filter web playwright test tests/e2e/critical-user-flows.spec.ts

# Run with UI mode (interactive)
pnpm --filter web playwright test --ui

# Run specific test suite
pnpm --filter web playwright test -g "Authentication"

# Run with debugging
pnpm --filter web playwright test --debug

# Generate HTML report
pnpm --filter web playwright test --reporter=html
```

### Success Criteria
- ✅ All critical user flows complete successfully
- ✅ Page load times < 3 seconds
- ✅ Dashboard loads < 5 seconds
- ✅ No critical console errors
- ✅ Responsive design works across viewports

---

## 📁 Test Results Structure

```
tests/
├── comprehensive-test-results/
│   ├── basic-load-20251010_120000.json
│   ├── basic-load-summary-20251010_120000.json
│   ├── auth-flow-20251010_120600.json
│   ├── auth-flow-summary-20251010_120600.json
│   ├── db-writes-20251010_122000.json
│   ├── db-writes-summary-20251010_122000.json
│   └── e2e-20251010_122800.log
└── playwright-report/
    └── index.html
```

---

## 🎯 Production Readiness Checklist

Use this checklist to validate production readiness:

### Performance ✅
- [ ] Basic load test passes
- [ ] p95 response time < 500ms
- [ ] p99 response time < 1000ms
- [ ] Throughput > 10 req/s
- [ ] Dashboard loads < 5s

### Functionality ✅
- [ ] User authentication works
- [ ] Project CRUD operations work
- [ ] Dashboard widgets load correctly
- [ ] ITP management functional
- [ ] File uploads work

### Scalability ✅
- [ ] Handles 50 concurrent users
- [ ] Handles 30 concurrent writers
- [ ] No performance degradation under load
- [ ] Database handles concurrent writes
- [ ] Write conflicts < 50

### Reliability ✅
- [ ] 100% uptime during tests
- [ ] Error rate < 10%
- [ ] No database transaction errors
- [ ] Proper error handling
- [ ] 404 pages handled gracefully

### Security ✅
- [ ] Authentication enforced
- [ ] Authorization working
- [ ] Rate limiting active
- [ ] No security warnings

### UX/UI ✅
- [ ] Mobile responsive
- [ ] Tablet responsive
- [ ] Fast page loads
- [ ] No console errors
- [ ] Smooth navigation

---

## 🔧 Troubleshooting

### Issue: k6 not found
```bash
# Check if k6 is installed
k6 version

# If not installed, reinstall
npm install -g k6

# Or use local install
export PATH="$HOME/bin:$PATH"
~/bin/k6 version
```

### Issue: Server not reachable
```bash
# Start the dev server
pnpm dev

# Check if server is running
curl http://localhost:3000/api/health
```

### Issue: Authentication tests fail
```bash
# Make sure test users exist
# Check database for test1@siteproof.com through test5@siteproof.com

# Or create them via signup API
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@siteproof.com","password":"Test123!@#"}'
```

### Issue: E2E tests fail
```bash
# Install Playwright browsers
pnpm --filter web playwright install

# Run with UI mode to debug
pnpm --filter web playwright test --ui

# Check environment variables
echo $TEST_USER_EMAIL
echo $BASE_URL
```

### Issue: Database write test creates too much data
```bash
# Clean up test data
psql your_database << EOF
DELETE FROM projects WHERE name LIKE 'LoadTest-%';
DELETE FROM contractors WHERE email LIKE '%@loadtest.com';
DELETE FROM materials WHERE name LIKE 'Material-VU%';
DELETE FROM ncrs WHERE title LIKE 'NCR-VU%';
EOF
```

---

## 📈 Interpreting Results

### k6 Metrics Explanation

- **http_req_duration** - Time spent making request
  - `p(95)<500` means 95% of requests under 500ms
  - `p(99)<1000` means 99% of requests under 1s

- **http_req_failed** - Percentage of failed requests
  - Target: < 10% (< 0.1 rate)

- **iterations** - Complete user flows
  - Higher is better

- **vus** - Virtual Users (concurrent users)
  - Shows scaling capability

### Custom Metrics

- **login_success** - % of successful logins
  - Target: > 80%

- **project_creation_success** - % of successful project creates
  - Target: > 70%

- **write_operation_latency** - Database write performance
  - Target: p95 < 2000ms

- **write_conflicts** - Concurrent write conflicts
  - Target: < 50 total

---

## 🎓 Best Practices

### Before Testing
1. ✅ Run tests against dev/test environment
2. ✅ Backup database if testing writes
3. ✅ Create test users
4. ✅ Ensure server is running
5. ✅ Check database connections

### During Testing
1. 📊 Monitor server resources (CPU, memory)
2. 📊 Watch database performance
3. 📊 Check logs for errors
4. 📊 Note any anomalies

### After Testing
1. 📝 Review all metrics
2. 📝 Compare with previous runs
3. 📝 Clean up test data
4. 📝 Document findings
5. 📝 Create improvement plan

---

## 🚀 Continuous Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  load-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run Load Tests
        run: ./tests/run-comprehensive-tests.sh
        env:
          BASE_URL: https://staging.siteproof.com

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: tests/comprehensive-test-results/
```

---

## 📞 Support

Need help with testing?

1. Check the troubleshooting section above
2. Review the k6 documentation: https://k6.io/docs/
3. Review Playwright docs: https://playwright.dev/
4. Check test output logs
5. Open an issue with test results attached

---

**Last Updated:** October 10, 2025
**Test Suite Version:** 1.0.0
**Maintainer:** Development Team
