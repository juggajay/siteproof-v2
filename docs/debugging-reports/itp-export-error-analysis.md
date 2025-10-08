# ITP Report Export Debugging Report

**Date:** 2025-10-08
**Issue:** "Error: Failed to fetch lot data" when exporting ITP report from lot page
**Severity:** High - Blocking user functionality

---

## Executive Summary

The ITP report export functionality is failing with "Failed to fetch lot data" error due to a **Next.js App Router params handling bug** in the export API route. The route is using synchronous params destructuring instead of awaiting the Promise, causing the database query to fail silently.

---

## Root Cause Analysis

### Primary Issue: Incorrect Params Handling in Next.js 15 App Router

**Location:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts`

**Line:** 6
**Code:**
```typescript
export async function GET(
  _request: NextRequest,
  { params }: { params: { projectId: string; lotId: string } }  // ❌ WRONG
) {
```

**Problem:**
In Next.js 15 App Router, dynamic route parameters are now returned as a **Promise** that must be awaited, not a synchronous object. The route is destructuring `params` as a plain object when it's actually a Promise.

**Actual Type Required:**
```typescript
{ params: Promise<{ projectId: string; lotId: string }> }  // ✅ CORRECT
```

---

## How the Bug Manifests

1. User clicks "Export ITP Report" button on lot detail page
2. Frontend calls: `GET /api/projects/${projectId}/lots/${lot.id}/export`
3. API route receives request with params as Promise
4. Code tries to destructure params synchronously: `const { projectId, lotId } = params;` (line 17)
5. `projectId` and `lotId` become `undefined` (Promise object has no these properties)
6. Supabase query executes with `.eq('id', undefined).eq('project_id', undefined)`
7. Query returns no results → `lotError` is set
8. Error handler returns: `{ error: 'Failed to fetch lot data' }` (line 38)

---

## Evidence

### 1. Error Location
```typescript
// Line 36-38 in export/route.ts
if (lotError) {
  console.error('Error fetching lot:', lotError);
  return NextResponse.json({ error: 'Failed to fetch lot data' }, { status: 500 });
}
```

### 2. Comparison with Working Routes

**Working Route Pattern (lots/[lotId]/route.ts - Line 4-7):**
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lotId: string }> }  // ✅ Promise
) {
  const { projectId, lotId } = await params;  // ✅ Awaited
```

**Broken Route Pattern (export/route.ts - Line 4-7):**
```typescript
export async function GET(
  _request: NextRequest,
  { params }: { params: { projectId: string; lotId: string } }  // ❌ No Promise
) {
  const { projectId, lotId } = params;  // ❌ Not awaited
```

### 3. Codebase Pattern Analysis

All other API routes in the same directory follow the correct pattern:
- `/api/projects/[projectId]/lots/route.ts` - Uses `Promise<{ projectId: string }>`
- `/api/projects/[projectId]/lots/[lotId]/route.ts` - Uses `Promise<{ projectId: string; lotId: string }>`
- `/api/projects/[projectId]/lots/[lotId]/itp/route.ts` - Uses `Promise<{ lotId: string }>`
- `/api/projects/[projectId]/lots/[lotId]/itp/[itpId]/route.ts` - Uses `Promise<{ itpId: string }>`

**Only the export route is incorrect.**

---

## Affected Files

### Primary File (Requires Fix)
- **File:** `/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts`
- **Lines:** 6, 17
- **Issue:** Missing Promise type and await

### Related Files (Working Correctly)
- **File:** `/apps/web/src/app/dashboard/projects/[id]/lots/[lotId]/lot-detail-client-simple.tsx`
- **Lines:** 50-85
- **Status:** Frontend code is correct - properly calls API endpoint

---

## Technical Details

### Database Query That's Failing

```typescript
// Line 20-34
const { data: lot, error: lotError } = await supabase
  .from('lots')
  .select(`
    *,
    itp_instances (
      id,
      name,
      status,
      completion_percentage,
      data
    )
  `)
  .eq('id', lotId)          // ❌ lotId is undefined
  .eq('project_id', projectId)  // ❌ projectId is undefined
  .single();
```

### Supabase Error (Likely)
When `lotId` and `projectId` are undefined, Supabase likely returns:
- Either no error but `data: null` (no match found)
- Or a validation error about missing/invalid parameters

---

## Recommended Fix

### Solution: Update params handling to match Next.js 15 pattern

**File:** `/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts`

**Change Line 6:**
```typescript
// Before:
{ params }: { params: { projectId: string; lotId: string } }

// After:
{ params }: { params: Promise<{ projectId: string; lotId: string }> }
```

**Change Line 17:**
```typescript
// Before:
const { projectId, lotId } = params;

// After:
const { projectId, lotId } = await params;
```

### Complete Fixed Code Section

```typescript
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lotId: string }> }  // ✅ Added Promise
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, lotId } = await params;  // ✅ Added await

    // Rest of the code remains the same...
```

---

## Testing Plan

### 1. Unit Test
```bash
# Navigate to lot page
curl -X GET "http://localhost:3000/api/projects/TEST_PROJECT_ID/lots/TEST_LOT_ID/export" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Should return success message with lot details
# Before fix: Returns { error: 'Failed to fetch lot data' }
# After fix: Returns { success: true, message: 'Report generation initiated', ... }
```

### 2. Integration Test
1. Log into the application
2. Navigate to a project
3. Open a lot detail page
4. Click "Export ITP Report" button
5. Verify success message appears
6. Verify redirect to reports page occurs

### 3. Verification Points
- [ ] No "Failed to fetch lot data" error
- [ ] Success message displays with correct lot number
- [ ] Completed ITP count is accurate
- [ ] Redirect to /dashboard/reports happens after 3 seconds
- [ ] No console errors in browser or server logs

---

## Impact Assessment

### User Impact
- **Severity:** High
- **Users Affected:** All users attempting to export ITP reports
- **Functionality Blocked:** Complete export feature is non-functional

### System Impact
- **Performance:** None - fix doesn't affect performance
- **Database:** None - fix prevents invalid queries
- **Security:** None - fix maintains existing security

---

## Prevention Recommendations

### 1. TypeScript Strict Mode
Enable stricter TypeScript checks to catch Promise type mismatches:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

### 2. Code Review Checklist
Add to review checklist:
- [ ] All App Router API route params are typed as `Promise<{}>`
- [ ] All params are awaited before use
- [ ] Pattern matches existing routes in the codebase

### 3. Linting Rule
Consider adding ESLint rule to detect unawaited params in App Router:
```javascript
// .eslintrc.js
{
  rules: {
    'no-unawaited-params': 'error'  // Custom rule
  }
}
```

### 4. Template/Generator
Create a code snippet or generator for API routes:
```typescript
// snippets/next-app-route.json
{
  "Next.js App Router GET": {
    "prefix": "nxget",
    "body": [
      "export async function GET(",
      "  _request: NextRequest,",
      "  { params }: { params: Promise<{ ${1:paramName}: string }> }",
      ") {",
      "  const { ${1:paramName} } = await params;",
      "  $0",
      "}"
    ]
  }
}
```

---

## Related Issues

### Potential Similar Bugs
Search codebase for other routes with synchronous params:
```bash
grep -r "{ params }: { params: {" apps/web/src/app/api --include="route.ts"
```

If found, audit and fix those routes as well.

---

## References

1. **Next.js 15 Release Notes:** [App Router Params Changes](https://nextjs.org/docs/app/api-reference/file-conventions/route)
2. **Similar Pattern in Codebase:** `/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/route.ts`
3. **Frontend Code:** `/apps/web/src/app/dashboard/projects/[id]/lots/[lotId]/lot-detail-client-simple.tsx` (lines 50-85)

---

## Conclusion

The bug is a straightforward type mismatch caused by Next.js 15's change to async params in App Router. The fix is simple (2 lines) and low-risk. Once applied, the export functionality should work as expected.

**Estimated Fix Time:** 2 minutes
**Risk Level:** Very Low
**Priority:** High (blocking feature)
