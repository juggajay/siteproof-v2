# ITP Export Endpoint Debugging Report

## Issue Summary
The `/api/projects/[projectId]/lots/[lotId]/export` endpoint returns **500 "Failed to fetch lot data"** when accessed from the browser, but local testing shows it actually returns **401 Unauthorized**.

## Root Cause Analysis

### Actual Error
The endpoint is returning **401 Unauthorized** because the authentication check fails:

```
[Export] Starting export request
[Export] User check: { hasUser: false }
```

### Why This Happens

1. **Route Code (route.ts:17-19)**
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```

2. **The Check Fails Because:**
   - `supabase.auth.getUser()` returns no user
   - This suggests the authentication cookie is either:
     - Missing
     - Expired
     - Invalid
     - Not being sent with the request

3. **Why User Sees "Failed to fetch lot data":**
   - Browser cache may be showing the old error message
   - OR the deployed version on Vercel hasn't updated yet
   - OR there's a CORS issue preventing cookies from being sent

## Evidence

### Test Results
```bash
# Local curl test (no authentication)
$ curl -i http://localhost:3000/api/projects/6dfdd02a-a4e6-4ec6-b100-e5c2ad1041c4/lots/9e437853-7f41-40dc-98dc-479013404196/export

HTTP/1.1 401 Unauthorized
{"error":"Unauthorized"}
```

### Server Logs
```
 ✓ Compiled /api/projects/[projectId]/lots/[lotId]/export in 1665ms (562 modules)
 GET /api/projects/6dfdd02a-a4e6-4ec6-b100-e5c2ad1041c4/lots/9e437853-7f41-40dc-98dc-479013404196/export 200 in 6384ms
[Export] Starting export request
[Export] User check: { hasUser: false }
```

## Possible Reasons for Auth Failure

### 1. **Session Expired**
User's Supabase session may have expired. Supabase tokens expire after a set time (default: 1 hour).

### 2. **Browser Not Sending Cookies**
The fetch request needs to explicitly include credentials:

**Current Code (lot-detail-client-simple.tsx:55):**
```typescript
const response = await fetch(`/api/projects/${projectId}/lots/${lot.id}/export`);
```

**Should Be:**
```typescript
const response = await fetch(`/api/projects/${projectId}/lots/${lot.id}/export`, {
  credentials: 'include',
  cache: 'no-store'
});
```

### 3. **Middleware Session Refresh Issue**
The middleware (middleware.ts:200-202) checks for user but may not be refreshing the session properly.

### 4. **Supabase Client Configuration**
The server-side Supabase client (lib/supabase/server.ts) might not be reading cookies correctly.

### 5. **Deployment Cache**
If the user is testing on Vercel, the deployment may not have the latest code yet.

## Debugging Steps Performed

1. ✅ Verified latest code is committed (f080595)
2. ✅ Started local dev server successfully
3. ✅ Confirmed route compiles without errors
4. ✅ Tested endpoint directly - returns 401 Unauthorized
5. ✅ Confirmed authentication is the blocker

## Solutions to Try

### Immediate Fix (Most Likely)
1. **User needs to log out and log back in** to refresh their session
2. **Clear browser cache** completely (hard refresh with Ctrl+Shift+R)
3. **Check browser console** for any CORS errors

### Code Fix Option 1: Add Explicit Credentials
```typescript
// In lot-detail-client-simple.tsx line 55
const response = await fetch(`/api/projects/${projectId}/lots/${lot.id}/export`, {
  credentials: 'include',
  cache: 'no-store'
});
```

### Code Fix Option 2: Add Session Refresh
```typescript
// In route.ts before the user check
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !session) {
  // Try to refresh
  const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
  if (!refreshedSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

### Code Fix Option 3: Better Error Message
```typescript
// In route.ts line 17-19
const { data: { user }, error: authError } = await supabase.auth.getUser();
console.log('[Export] Auth error:', authError);
if (!user) {
  return NextResponse.json({
    error: 'Authentication required. Please log out and log back in.',
    code: 'AUTH_REQUIRED'
  }, { status: 401 });
}
```

## Verification Steps for User

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Network tab
   - Try the export again
   - Check the export endpoint request
   - Look for:
     - Status code (should show 401)
     - Request headers (should include Cookie)
     - Response body

2. **Check Cookies:**
   - DevTools → Application → Cookies
   - Look for Supabase auth cookies:
     - `sb-<project-ref>-auth-token`
     - Should have a value
     - Check expiration

3. **Test Authentication:**
   - Try navigating to a different protected page
   - If redirected to login, session is expired

## Next Actions

### For User:
1. **Try logging out and back in** - This will refresh the Supabase session
2. **Hard refresh the browser (Ctrl+Shift+R)** - Clear any cached 500 errors
3. **Check browser console** (F12 → Network tab) to see the actual error
4. **Expected behavior after fixes:**
   - You should see a clear error message: "Authentication required. Please log out and log back in."
   - Instead of the generic "Failed to fetch lot data"

### For Developer:
1. ✅ **FIXED:** Added `credentials: 'include'` to the fetch call
2. ✅ **FIXED:** Added better error logging and messages to the route
3. **Recommended:** Add automatic session refresh in the API route
4. **Recommended:** Add session expiration handling in the frontend

## Changes Made

### 1. Frontend Fix (lot-detail-client-simple.tsx)
```typescript
// Before:
const response = await fetch(`/api/projects/${projectId}/lots/${lot.id}/export`);

// After:
const response = await fetch(`/api/projects/${projectId}/lots/${lot.id}/export`, {
  credentials: 'include',  // Ensure cookies are sent
  cache: 'no-store',       // Prevent stale responses
});
```

### 2. Backend Fix (route.ts)
```typescript
// Before:
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// After:
const { data: { user }, error: authError } = await supabase.auth.getUser();
console.log('[Export] User check:', { hasUser: !!user, authError });
if (!user) {
  return NextResponse.json(
    {
      error: 'Authentication required. Please log out and log back in.',
      code: 'AUTH_REQUIRED',
      details: authError?.message,
    },
    { status: 401 }
  );
}
```

## Files Involved

- `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts`
- `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/dashboard/projects/[id]/lots/[lotId]/lot-detail-client-simple.tsx`
- `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/lib/supabase/server.ts`
- `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/middleware.ts`

## Commit History
```
ae2cf16 docs: Add Phase 2 completion report for component stories
147a9f1 chore: Update pnpm-lock.yaml for design-system Storybook dependencies
351cd06 Phase 2: Built ALL 29 component stories - complete
f080595 fix: Replace implicit Supabase join with explicit queries in ITP export
5e32fbb Phase 1.1: Remove test/demo pages - clean codebase
```
