# Report Deletion 404 Bug - Debug Summary

## Problem

DELETE request returns 404 error even though GET shows the report exists:
```
DELETE /api/reports/0794edb1-f272-4b8b-8a96-825a145e5041
Response: 404 - "Report not found or you do not have permission to delete it"
       deletedCount: 0
```

## Investigation Results

### Code Analysis

**File:** `/apps/web/src/app/api/reports/[id]/route.ts`
**Version:** v3-multi-org (line 7)

**Critical Finding:** The code has already been updated to remove the problematic `.eq('organization_id', member.organization_id)` filter from the SELECT query (line 70), but the issue persists.

### Current Logic Flow

```
1. Get authenticated user ✅
2. Get user's organization memberships ✅
3. SELECT report via RLS (no explicit org filter) ✅
4. Check if report exists ← FAILS HERE (returns null)
5. Return 404 ← NEVER REACHES DELETE
```

### The Bug Location

**Lines 64-91:** Pre-deletion lookup fails

```typescript
const { data: report } = await supabase
  .from('report_queue')
  .select('id, requested_by, organization_id')
  .eq('id', reportId)
  .maybeSingle();  // ← Returns null even though RLS should allow access

if (!report) {
  return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  // ← STOPS HERE, never attempts DELETE
}
```

## Root Cause

### Two-Part Problem

#### 1. Database Issue: Missing DELETE Policy

**Base migration:** `/packages/database/migrations/0010_report_queue.sql`

```sql
-- Lines 294-301: SELECT policy ✅
CREATE POLICY "Users can view reports in their organization"
  ON report_queue FOR SELECT ...

-- Lines 304-311: INSERT policy ✅
CREATE POLICY "Users can create reports in their organization"
  ON report_queue FOR INSERT ...

-- Lines 314-323: UPDATE policy ✅
CREATE POLICY "Users can update their own reports"
  ON report_queue FOR UPDATE ...

-- DELETE policy: ❌ MISSING
-- No DELETE policy defined in base migration!
```

**Fix migration:** `/packages/database/migrations/0031_final_fix_report_delete_permissions.sql`
- Should add DELETE policy
- Status: Unknown if applied to production database

#### 2. Code Issue: RLS SELECT Query Failing

The pre-check SELECT query at line 70 returns `null` even though:
- Same user can see the report via GET /api/reports ✅
- RLS SELECT policy should allow access ✅
- Report ID is valid and exists ✅

**Possible causes:**
1. **RLS context issue:** `auth.uid()` not properly set in Supabase client during DELETE
2. **Timing issue:** Organization membership not committed when SELECT runs
3. **Multi-org edge case:** User has multiple orgs, RLS filtering incorrectly
4. **Policy mismatch:** SELECT policy has subtle condition that fails for single-item lookup

## Evidence

### What Works (GET Endpoint)

```
GET /api/reports?limit=50
→ RLS SELECT policy applied
→ Response: 200 OK, 1 report visible
→ Report ID: 0794edb1-f272-4b8b-8a96-825a145e5041
```

### What Fails (DELETE Endpoint)

```
DELETE /api/reports/0794edb1-f272-4b8b-8a96-825a145e5041
→ Pre-check SELECT at line 70
→ RLS policy applied
→ Result: report = null ❌
→ Code returns 404
→ Never reaches actual DELETE operation
```

## The Fix

### Recommended Solution: Remove Pre-check, Trust RLS

**Replace lines 62-111 in `/apps/web/src/app/api/reports/[id]/route.ts`:**

```typescript
// Remove entire pre-check block (lines 62-105)
// Go directly to DELETE and let RLS handle authorization

const { error: deleteError, count: deleteCount } = await supabase
  .from('report_queue')
  .delete({ count: 'exact' })
  .eq('id', reportId);

console.log('[DELETE /api/reports/[id]] Delete result:', {
  reportId,
  deleteCount,
  errorCode: deleteError?.code,
  userId: user.id,
});

// Handle RLS permission denied (42501 = insufficient_privilege)
if (deleteError) {
  if (deleteError.code === '42501') {
    return NextResponse.json(
      { error: 'You do not have permission to delete this report' },
      { status: 403 }
    );
  }
  return NextResponse.json(
    { error: `Failed to delete report: ${deleteError.message}` },
    { status: 500 }
  );
}

// Handle not found
if (!deleteCount || deleteCount === 0) {
  return NextResponse.json(
    { error: 'Report not found or you do not have permission to delete it' },
    { status: 404 }
  );
}

// Success
console.log('[DELETE /api/reports/[id]] Successfully deleted:', reportId);
return NextResponse.json({
  success: true,
  message: 'Report deleted successfully',
  deletedCount: deleteCount,
});
```

**Why this works:**
- Eliminates the failing pre-check SELECT query
- RLS policies handle all authorization at the database level
- Fewer database queries = better performance
- Simpler code = easier to maintain
- No opportunity for SELECT/DELETE policy mismatch

### Required Database Fix

**Verify DELETE policy exists:**

```sql
SELECT polname, pg_get_expr(polqual, polrelid) as policy
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';
```

**If no results:** Apply migration 0031

```bash
psql $DATABASE_URL -f packages/database/migrations/0031_final_fix_report_delete_permissions.sql
```

**Expected policy:**
```sql
CREATE POLICY "report_queue_delete_allow_org_members"
ON report_queue FOR DELETE
USING (
  requested_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = report_queue.organization_id
      AND user_id = auth.uid()
  )
);
```

## Implementation Steps

1. **Apply database migration** (if needed)
   ```bash
   psql $DATABASE_URL -f packages/database/migrations/0031_final_fix_report_delete_permissions.sql
   ```

2. **Update route code** (remove pre-check)
   ```bash
   # Edit apps/web/src/app/api/reports/[id]/route.ts
   # Replace lines 62-111 with simplified DELETE logic
   ```

3. **Test locally**
   ```bash
   pnpm dev
   # Try deleting a report in browser
   # Check browser console for success
   ```

4. **Verify logs show correct behavior**
   ```
   [DELETE /api/reports/[id]] Delete result: { reportId: '...', deleteCount: 1 }
   ```

5. **Deploy**
   ```bash
   git add .
   git commit -m "fix: simplify report deletion to trust RLS policies"
   git push
   ```

## Testing Checklist

- [ ] User can delete their own report (200 OK)
- [ ] User gets 404 for non-existent report
- [ ] User gets 404 for report in different organization
- [ ] Admin can delete any report in their organization
- [ ] Console logs show deleteCount = 1 on success
- [ ] Console logs show deleteCount = 0 on not found
- [ ] No more premature 404 errors

## Key Takeaway

**The issue:** Code tried to verify permissions with SELECT before DELETE, but SELECT query failed due to RLS edge case, causing premature 404.

**The solution:** Remove pre-check, let RLS policies on DELETE handle everything. Simpler, faster, more reliable.

## Files Modified

1. `/apps/web/src/app/api/reports/[id]/route.ts` - Remove pre-check (lines 62-111)
2. `/packages/database/migrations/0031_final_fix_report_delete_permissions.sql` - Ensure applied

## Related Documentation

- `/docs/fixes/report-deletion-root-cause-analysis.md` - Detailed root cause
- `/docs/fixes/report-deletion-404-diagnosis.md` - Complete diagnostic guide
- `/docs/fixes/report-deletion-fix-implementation.md` - Implementation guide
- `/docs/report-queue-rls-analysis.md` - Original RLS analysis
