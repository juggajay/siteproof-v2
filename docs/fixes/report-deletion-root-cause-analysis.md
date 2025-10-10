# Report Deletion 404 Error - Root Cause Analysis

## Executive Summary

Report deletion is failing with a 404 error ("Report not found or you do not have permission to delete it") even though the same report can be successfully fetched via GET. The issue is in the DELETE route logic at `/apps/web/src/app/api/reports/[id]/route.ts`.

## Key Evidence

1. **GET /api/reports?limit=50** returns 200 OK with 1 report visible
2. **DELETE /api/reports/0794edb1-f272-4b8b-8a96-825a145e5041** returns 404
3. Response includes: `deletedCount: 0, visible: false`

## Root Cause

### The Problem (Lines 56-86 of route.ts)

```typescript
// Lines 56-86: Pre-deletion lookup
const {
  data: report,
  error: lookupError,
} = await supabase
  .from('report_queue')
  .select('id, requested_by, organization_id')
  .eq('id', reportId)
  .eq('organization_id', member.organization_id)  // ❌ PROBLEM LINE
  .maybeSingle();

if (!report) {
  return NextResponse.json(
    { error: 'Report not found' },
    { status: 404 }
  );
}
```

**The bug:** The code adds `.eq('organization_id', member.organization_id)` to the SELECT query at line 64. This is unnecessary because RLS policies already filter reports by organization membership.

### Why This Causes the 404

The original `0010_report_queue.sql` migration **does not include a DELETE policy**. Looking at lines 293-323:

```sql
-- Users can see reports in their organization (SELECT policy)
CREATE POLICY "Users can view reports in their organization"
  ON report_queue FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their own reports (UPDATE policy)
CREATE POLICY "Users can update their own reports"
  ON report_queue FOR UPDATE
  USING (
    requested_by = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ❌ NO DELETE POLICY DEFINED
```

### The Sequence of Failures

1. **Backend lookup attempt (lines 56-66):**
   - Backend calls `.eq('organization_id', member.organization_id)`
   - This additional filter is too restrictive or the organization_id lookup fails
   - Query returns `null` even though RLS would allow SELECT

2. **404 returned prematurely (lines 75-86):**
   - Code checks `if (!report)` and returns 404
   - Never attempts the actual DELETE operation

3. **DELETE attempt (lines 90-94):**
   - Would have been executed with RLS policies
   - But there's **no DELETE policy** in the base migration (0010)
   - Even if it reached this point, DELETE would fail

## Evidence from Migrations

### Migration 0010 (Initial) - NO DELETE POLICY
File: `/packages/database/migrations/0010_report_queue.sql`
- SELECT policy: ✅ Exists (lines 294-301)
- INSERT policy: ✅ Exists (lines 304-311)
- UPDATE policy: ✅ Exists (lines 314-323)
- DELETE policy: ❌ **MISSING**

### Migration 0031 (Latest Fix Attempt)
File: `/packages/database/migrations/0031_final_fix_report_delete_permissions.sql`
- Claims to fix DELETE permissions
- Creates: `report_queue_delete_allow_org_members` policy
- Allows: Owner OR any org member

**Problem:** This migration may not have been applied to the production database.

## Why GET Works But DELETE Fails

### GET Request (200 OK)
```
GET /api/reports?limit=50
→ Backend: supabase.from('report_queue').select('*')
→ RLS: SELECT policy allows viewing reports in user's organization
→ Result: ✅ Report visible
```

### DELETE Request (404 Error)
```
DELETE /api/reports/[id]
→ Backend: Pre-check with .eq('organization_id', member.organization_id)
→ Query: Returns null (due to overly restrictive filter OR organization_id mismatch)
→ Code: Returns 404 before attempting DELETE
→ Result: ❌ Never reaches DELETE operation
```

## The Dual Problem

1. **Code Issue:** Lines 56-66 add unnecessary `.eq('organization_id', member.organization_id)` filter
2. **Database Issue:** No DELETE policy in base migration (0010), and later fixes may not be applied

## Solutions

### Option 1: Fix the Route Code (Immediate Fix)

Remove the overly restrictive organization_id filter from the pre-check:

```typescript
// BEFORE (lines 56-66)
const { data: report } = await supabase
  .from('report_queue')
  .select('id, requested_by, organization_id')
  .eq('id', reportId)
  .eq('organization_id', member.organization_id)  // ❌ Remove this
  .maybeSingle();

// AFTER
const { data: report } = await supabase
  .from('report_queue')
  .select('id, requested_by, organization_id')
  .eq('id', reportId)
  // RLS policies will handle organization filtering
  .maybeSingle();
```

**Rationale:**
- RLS SELECT policy already filters by organization membership
- The explicit `.eq('organization_id', member.organization_id)` is redundant
- Removing it lets RLS handle the authorization correctly

### Option 2: Remove Pre-check Entirely (Better Fix)

```typescript
// Skip lines 56-86 entirely, go directly to DELETE
const { error: deleteError, count: deleteCount } = await supabase
  .from('report_queue')
  .delete({ returning: 'minimal', count: 'exact' })
  .eq('id', reportId);

// Handle errors based on deleteCount
if (deleteCount === 0) {
  // Report doesn't exist OR user doesn't have DELETE permission
  return NextResponse.json(
    { error: 'Report not found or you do not have permission to delete it' },
    { status: 404 }
  );
}
```

**Rationale:**
- Let RLS policies handle all authorization
- Simpler code with fewer database queries
- Correct HTTP status based on DELETE result

### Option 3: Apply Migration 0031 (Database Fix)

Ensure the DELETE policy migration is applied to production:

```bash
# Check current policies
SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';

# If no DELETE policy, apply migration 0031
psql $DATABASE_URL -f packages/database/migrations/0031_final_fix_report_delete_permissions.sql
```

## Recommended Action Plan

1. **Immediate:** Fix route code (Option 1 or 2)
2. **Short-term:** Verify migration 0031 is applied to production
3. **Long-term:** Add database tests to verify RLS policies

## Testing Strategy

### Manual Test
```bash
# 1. GET the report (should work)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/reports/0794edb1-f272-4b8b-8a96-825a145e5041

# 2. DELETE the report (should work after fix)
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/reports/0794edb1-f272-4b8b-8a96-825a145e5041
```

### Database Verification
```sql
-- Check if user can see the report
SELECT id, report_name, organization_id, requested_by
FROM report_queue
WHERE id = '0794edb1-f272-4b8b-8a96-825a145e5041';

-- Check user's organization membership
SELECT organization_id, role
FROM organization_members
WHERE user_id = auth.uid();

-- Verify DELETE policy exists
SELECT polname FROM pg_policy
WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';
```

## Files to Modify

1. `/apps/web/src/app/api/reports/[id]/route.ts` (lines 56-86)
2. Verify `/packages/database/migrations/0031_final_fix_report_delete_permissions.sql` is applied

## Conclusion

The 404 error is caused by:
1. **Primary:** Overly restrictive pre-check filter at line 64 (`.eq('organization_id', member.organization_id)`)
2. **Secondary:** Missing DELETE policy in base migration, with unclear status of fix migrations

The simplest fix is to remove the redundant organization filter and let RLS policies handle authorization correctly.
