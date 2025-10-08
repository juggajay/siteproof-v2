# 🧪 Security Testing Guide

## Overview

This guide provides step-by-step instructions for testing all security features implemented in the SiteProof application.

---

## 1. CSRF Protection Testing

### Test 1: POST Request Without CSRF Token

```bash
# Should return 403 Invalid CSRF token
curl -X POST http://localhost:3000/api/diaries \
  -H "Content-Type: application/json" \
  -d '{"diary_date": "2025-10-08", "project_id": "test"}'
```

**Expected Result:** `403 Invalid CSRF token`

### Test 2: POST Request With Valid CSRF Token

```bash
# First, get CSRF token from a GET request
curl -i http://localhost:3000/dashboard \
  -H "Cookie: sb-access-token=your-session-token" \
  | grep "csrf-token"

# Then use it in POST request
curl -X POST http://localhost:3000/api/diaries \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -H "Cookie: csrf-token=YOUR_CSRF_TOKEN; sb-access-token=your-session-token" \
  -d '{"diary_date": "2025-10-08", "project_id": "valid-uuid"}'
```

**Expected Result:** Request proceeds (may fail for other reasons like validation)

---

## 2. Rate Limiting Testing

### Test 1: Auth Route Rate Limiting (5 req / 15 min)

```bash
# Send 6 requests rapidly
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "test"}' \
    -w "\nHTTP Status: %{http_code}\n\n"
done
```

**Expected Result:**

- Requests 1-5: 401 Unauthorized (wrong credentials) or 400
- Request 6: **429 Too Many Requests**

### Test 2: Dashboard Route Rate Limiting (100 req / min)

```bash
# Send 105 requests rapidly
for i in {1..105}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    http://localhost:3000/dashboard
done | tail -10
```

**Expected Result:** Last 5 requests should return **429**

### Test 3: Check Rate Limit Headers

```bash
curl -i http://localhost:3000/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test"}'
```

**Expected Headers:**

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 2025-10-08T05:00:00.000Z
```

---

## 3. Input Validation Testing

### Test 1: Invalid UUID

```bash
# Should return 400 Validation failed
curl http://localhost:3000/api/diaries/not-a-uuid
```

**Expected Result:**

```json
{
  "error": "Validation failed",
  "validationErrors": {
    "id": ["Invalid UUID format"]
  }
}
```

### Test 2: Invalid Request Body

```bash
curl -X POST http://localhost:3000/api/diaries \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: YOUR_TOKEN" \
  -H "Cookie: csrf-token=YOUR_TOKEN" \
  -d '{
    "diary_date": "not-a-date",
    "project_id": "not-a-uuid",
    "work_summary": "Too short"
  }'
```

**Expected Result:**

```json
{
  "error": "Validation failed",
  "validationErrors": {
    "diary_date": ["Invalid date format. Expected ISO 8601 datetime string"],
    "project_id": ["Invalid UUID format"],
    "work_summary": ["String must contain at least 10 character(s)"]
  }
}
```

### Test 3: Valid Request Body

```bash
curl -X POST http://localhost:3000/api/diaries \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: YOUR_TOKEN" \
  -H "Cookie: csrf-token=YOUR_TOKEN" \
  -d '{
    "diary_date": "2025-10-08T10:00:00.000Z",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "work_summary": "Completed foundation work on Block A"
  }'
```

**Expected Result:** Request proceeds (may need authentication)

---

## 4. Authorization Testing

### Test 1: Financial Data Filtering (Viewer Role)

```bash
# Login as viewer role user
# Then fetch diary
curl http://localhost:3000/api/diaries/DIARY_ID \
  -H "Cookie: your-session-cookie"
```

**Expected Result:**

```json
{
  "diary": {
    "trades_on_site": [
      {
        "trade": "Plumber",
        "company": "ABC Plumbing",
        "workers": 3
        // ✅ NO hourly_rate, daily_rate, total_cost
      }
    ],
    "labour_entries": [
      {
        "worker_name": "John Doe",
        "total_hours": 8
        // ✅ NO standard_rate, overtime_rate, total_cost
      }
    ]
  }
}
```

### Test 2: Financial Data Access (Admin Role)

```bash
# Login as admin role user
# Then fetch diary
curl http://localhost:3000/api/diaries/DIARY_ID \
  -H "Cookie: your-session-cookie"
```

**Expected Result:**

```json
{
  "diary": {
    "trades_on_site": [
      {
        "trade": "Plumber",
        "company": "ABC Plumbing",
        "workers": 3,
        "hourly_rate": 45.0, // ✅ INCLUDED
        "daily_rate": 360.0, // ✅ INCLUDED
        "total_cost": 1080.0 // ✅ INCLUDED
      }
    ]
  }
}
```

### Test 3: Cross-Organization Access

```bash
# Try to access diary from different organization
curl http://localhost:3000/api/diaries/OTHER_ORG_DIARY_ID \
  -H "Cookie: your-session-cookie"
```

**Expected Result:** `403 Access denied`

---

## 5. Content Security Policy (CSP) Testing

### Test 1: Check CSP Headers

```bash
curl -I http://localhost:3000/
```

**Expected Headers:**

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-RANDOM' 'strict-dynamic' https://*.supabase.co; style-src 'self' 'nonce-RANDOM' https://fonts.googleapis.com; ...
X-Nonce: BASE64_ENCODED_NONCE
```

### Test 2: Verify No Unsafe Directives

**Check that CSP does NOT contain:**

- ❌ `'unsafe-eval'`
- ❌ `'unsafe-inline'` (in script-src)

**Should contain:**

- ✅ `'nonce-RANDOM'`
- ✅ `'strict-dynamic'`

### Test 3: Browser Console Test

1. Open browser DevTools (F12)
2. Navigate to http://localhost:3000
3. Check Console for CSP violations
4. Try to execute inline script:

```javascript
// This should be blocked by CSP
eval("console.log('test')"); // ❌ Should fail
```

**Expected:** CSP violation error in console

---

## 6. Authentication Testing

### Test 1: Unauthenticated Access

```bash
# Try to access protected route without auth
curl http://localhost:3000/api/diaries
```

**Expected Result:** `401 Unauthorized`

### Test 2: Invalid Credentials

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "wrong@example.com", "password": "wrongpass"}'
```

**Expected Result:** `401 Unauthorized` or `400 Invalid credentials`

### Test 3: Session Validation

```bash
# Access protected route with valid session
curl http://localhost:3000/api/diaries \
  -H "Cookie: sb-access-token=VALID_TOKEN"
```

**Expected Result:** 200 OK (with data)

---

## 7. Error Handling Testing

### Test 1: Zod Validation Error

```bash
curl -X POST http://localhost:3000/api/ncrs \
  -H "Content-Type: application/json" \
  -d '{"title": "Bad", "description": "Too short"}'
```

**Expected Result:**

```json
{
  "error": "Validation failed",
  "validationErrors": {
    "title": ["String must contain at least 5 character(s)"],
    "description": ["String must contain at least 20 character(s)"]
  }
}
```

### Test 2: Not Found Error

```bash
curl http://localhost:3000/api/diaries/550e8400-e29b-41d4-a716-446655440000
```

**Expected Result:**

```json
{
  "error": "Diary not found"
}
```

**Should NOT contain:**

- ❌ Stack traces
- ❌ File paths
- ❌ Environment variable names
- ❌ Database query details

### Test 3: Internal Server Error

Trigger an error in the code and check the response:

**Expected Result (Production):**

```json
{
  "error": "An unexpected error occurred"
}
```

**Expected Result (Development):**

```json
{
  "error": "An unexpected error occurred",
  "details": "Detailed error message"
}
```

---

## 8. Pre-commit Hook Testing

### Test 1: Try to Commit .env.local

```bash
# Create a test .env.local file
echo "SUPABASE_SERVICE_ROLE_KEY=test-key" > test.env.local

# Try to commit it
git add test.env.local
git commit -m "Test commit"
```

**Expected Result:**

```
❌ ERROR: Attempting to commit .env.local files
   .env.local files contain sensitive credentials and should NEVER be committed
```

### Test 2: Try to Commit Code with API Key

```bash
# Create a file with an API key
echo 'const key = "sk-ant-api03-test123"' > test-file.ts

# Try to commit it
git add test-file.ts
git commit -m "Test commit"
```

**Expected Result:**

```
❌ ERROR: Potential secret detected in staged changes
```

### Test 3: Commit Safe Code

```bash
# Create a safe file
echo 'const key = process.env.API_KEY' > safe-file.ts

# Commit it
git add safe-file.ts
git commit -m "Add safe code"
```

**Expected Result:**

```
✅ Pre-commit security checks passed
```

---

## 9. Permission System Testing

### Test 1: Check Role Permissions

Create a test script `test-permissions.ts`:

```typescript
import { diaryPermissions, hasFinancialAccess } from '@/lib/auth/permissions';

// Test viewer role
console.log('Viewer can create diary:', diaryPermissions.canCreate('viewer')); // false
console.log('Viewer can view diary:', diaryPermissions.canView('viewer')); // true
console.log('Viewer has financial access:', hasFinancialAccess('viewer')); // false

// Test admin role
console.log('Admin can create diary:', diaryPermissions.canCreate('admin')); // true
console.log('Admin can delete diary:', diaryPermissions.canDelete('admin')); // true
console.log('Admin has financial access:', hasFinancialAccess('admin')); // true
```

Run: `npx tsx test-permissions.ts`

### Test 2: Financial Data Filtering

```typescript
import { filterFinancialData } from '@/lib/auth/permissions';

const data = {
  name: 'John',
  hourly_rate: 50,
  daily_rate: 400,
  total_cost: 2000,
};

console.log('Viewer sees:', filterFinancialData(data, 'viewer'));
// { name: 'John' }

console.log('Admin sees:', filterFinancialData(data, 'admin'));
// { name: 'John', hourly_rate: 50, daily_rate: 400, total_cost: 2000 }
```

---

## 10. Automated Testing

### Run All Tests

```bash
# Unit tests
npm run test

# Security-specific tests
npm run test -- --grep "security"

# Coverage report
npm run test:coverage
```

### ESLint Security Check

```bash
cd apps/web
npm run lint

# Should show no security violations
```

### Type Checking

```bash
npm run type-check

# Should compile without errors
```

---

## 11. CI/CD Security Scans

### Run Locally

```bash
# npm audit
npm audit --audit-level=high

# Check for secrets
git log -p | grep -E "(API_KEY|SECRET|PASSWORD)"
```

### GitHub Actions

Push to a branch and check:

1. Dependency Scan results
2. Secret Scan results
3. CodeQL results
4. ESLint Security results

---

## 12. Manual Security Review

### Checklist

- [ ] All API routes have UUID validation
- [ ] All request bodies validated with Zod
- [ ] Authentication checked on all protected routes
- [ ] Authorization checked with permission helpers
- [ ] Financial data filtered based on role
- [ ] No secrets in code or committed files
- [ ] Error messages don't leak internal details
- [ ] CSRF protection works on POST/PUT/DELETE
- [ ] Rate limiting works on all routes
- [ ] CSP headers are correct
- [ ] Pre-commit hook blocks secrets

---

## 📊 Testing Checklist

### Before Deploying

- [ ] CSRF Protection: 3 tests passed
- [ ] Rate Limiting: 3 tests passed
- [ ] Input Validation: 3 tests passed
- [ ] Authorization: 3 tests passed
- [ ] CSP: 3 tests passed
- [ ] Authentication: 3 tests passed
- [ ] Error Handling: 3 tests passed
- [ ] Pre-commit Hooks: 3 tests passed
- [ ] Permissions: 2 tests passed
- [ ] Automated Tests: All passed
- [ ] ESLint: No security violations
- [ ] Type Check: No errors
- [ ] CI/CD Scans: All passed

### After Deploying

- [ ] Monitor error logs for 24 hours
- [ ] Check rate limit violations
- [ ] Review CSP reports
- [ ] Verify no authentication issues
- [ ] Check for validation errors
- [ ] Monitor API response times

---

## 🐛 Troubleshooting

### CSRF Token Issues

**Problem:** "Invalid CSRF token" on valid requests

**Solution:**

1. Check that CSRF_SECRET is set in environment
2. Verify cookie is set: `document.cookie` should include `csrf-token`
3. Check that header is sent: Network tab → Headers → `x-csrf-token`
4. Ensure cookie and header match

### Rate Limiting False Positives

**Problem:** Rate limited even with few requests

**Solution:**

1. Check if IP is correct: Look at `x-forwarded-for` header
2. Clear rate limit: Restart rate limit service
3. Adjust limits in middleware if needed

### Validation Errors

**Problem:** Valid data rejected

**Solution:**

1. Check Zod schema matches expected format
2. Verify UUIDs are valid v4 UUIDs
3. Check date format is ISO 8601
4. Review schema in `lib/validation/schemas.ts`

---

**Last Updated:** 2025-10-08
**Version:** 1.0.0
