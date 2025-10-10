# Report Deletion Diagnostic Steps

## Issue Summary
The DELETE API endpoint code has been updated to return 404 with an error message when deletedCount is 0, but the browser console shows the old 200 success response with "Report deleted successfully (or already deleted)".

## Code Verification (COMPLETED)
✅ **File content verified**: `/apps/web/src/app/api/reports/[id]/route.ts` lines 84-99 correctly return 404
✅ **Git status confirmed**: File shows as modified with the correct changes
✅ **Server restarted**: Next.js dev server was killed and restarted with clean `.next` cache
✅ **Server running**: Fresh Next.js server is running on port 3000

## Root Cause Analysis

### The code is correct, but the browser is seeing cached responses

**Evidence:**
1. Source file shows: `return NextResponse.json({ error: '...' }, { status: 404 })`
2. Console logs show: `{"success":true,"message":"Report deleted successfully (or already deleted)","deletedCount":0}`
3. This exact message only exists in documentation, not in current code

**Conclusion:** This is a **client-side caching issue**, not a server-side code issue.

## Diagnostic Steps to Run

### Step 1: Clear Browser Cache
```bash
# In browser DevTools:
1. Open DevTools (F12)
2. Right-click on the Refresh button
3. Select "Empty Cache and Hard Reload"
4. OR: Go to Application tab -> Clear site data
```

### Step 2: Verify Server is Serving Updated Code
```bash
# Add a unique log message to verify code version
cd /home/jayso/projects/siteproof-v2
# Check server logs for the new console.error messages
grep -r "DELETE returned 0 rows" apps/web/.next/server/ 2>/dev/null

# Or add a version marker to the response
```

### Step 3: Test with curl (bypass browser cache)
```bash
# Get auth token from browser
# Then test DELETE directly

curl -X DELETE \
  http://localhost:3000/api/reports/[REPORT_ID] \
  -H "Cookie: [AUTH_COOKIES]" \
  -H "Accept: application/json" \
  -v

# Expected: Status 404 with new error message
```

### Step 4: Check Server Logs
The server should log these messages when DELETE returns 0 rows:
```
[DELETE /api/reports/[id]] No rows deleted for report: [id]
DELETE returned 0 rows, and subsequent SELECT also returned 0 rows
Possible causes: 1) Report already deleted, 2) User lost permissions, 3) RLS policy mismatch
Returning 404 to avoid false success when report may still exist
```

### Step 5: Check for Service Worker or HTTP Caching
```bash
# In browser DevTools -> Application tab:
1. Check if Service Workers are registered
2. Unregister any service workers
3. Check Network tab -> Disable cache checkbox
```

### Step 6: Add Cache-Control Headers
The API route should explicitly prevent caching:
```typescript
return NextResponse.json(
  { error: '...' },
  {
    status: 404,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }
);
```

## Action Items

### Immediate Actions:
1. **Hard refresh browser** with DevTools open
2. **Check Network tab** to see actual HTTP response (not console logs)
3. **Verify response headers** show no caching
4. **Check server terminal** for new error logs

### Code Enhancements:
1. Add explicit `Cache-Control` headers to DELETE endpoint
2. Add version/timestamp to responses for debugging
3. Add unique console.log identifier to track code version

### RLS Policy Investigation:
The real underlying issue is that DELETE is returning 0 rows even though:
- User is authenticated
- Report exists (based on previous successful reads)
- User should have permission (they requested the report or are in the same org)

**Next steps for RLS investigation:**
1. Check Supabase dashboard for DELETE policy details
2. Review the RLS policy migration files
3. Test DELETE query directly in Supabase SQL editor
4. Check if user's organization membership and role are being evaluated correctly

## Expected Behavior After Cache Clear

### Current (Incorrect) Behavior:
```json
{
  "success": true,
  "message": "Report deleted successfully (or already deleted)",
  "deletedCount": 0
}
```
Status: 200

### Expected (Correct) Behavior:
```json
{
  "error": "Report not found or you do not have permission to delete it",
  "details": {
    "reportId": "...",
    "deletedCount": 0,
    "visible": false,
    "hint": "The report may have been already deleted, or you may lack permission to delete it."
  }
}
```
Status: 404

## Server Logs to Check

When the new code runs, you should see:
```
[DELETE /api/reports/[id]] Request received
[DELETE /api/reports/[id]] Params: { id: '...' }
[DELETE /api/reports/[id]] Report ID: ...
[DELETE /api/reports/[id]] User lookup result: { userId: '...', userError: undefined }
[DELETE /api/reports/[id]] Attempting to delete report: ... for user: ...
No rows deleted for report: ...
Post-delete check: { checkReport: null, checkError: null }
DELETE returned 0 rows, and subsequent SELECT also returned 0 rows
Possible causes: 1) Report already deleted, 2) User lost permissions, 3) RLS policy mismatch
Returning 404 to avoid false success when report may still exist
```

## Files to Review

1. `/apps/web/src/app/api/reports/[id]/route.ts` - DELETE handler (VERIFIED CORRECT)
2. `/packages/database/migrations/0028_fix_report_queue_delete_policy.sql` - RLS policy
3. Browser Network tab - Actual HTTP responses
4. Server terminal output - Runtime logs
