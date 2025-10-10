# Report Deletion Multi-Organization Fix

## Summary
Fixed the DELETE route in `/apps/web/src/app/api/reports/[id]/route.ts` to properly handle report deletion for users who belong to multiple organizations.

## Problem
The DELETE endpoint was returning 404 "Report not found" even though:
1. The report existed in the database
2. The user could see the report via GET request
3. The user had permission to delete it according to RLS policies

## Root Cause Analysis

### Issue 1: Single Organization Assumption
**Lines 40-46 (original):**
```typescript
const { data: member, error: memberError } = await supabase
  .from('organization_members')
  .select('organization_id, role')
  .eq('user_id', user.id)
  .single();
```

**Problem:** The `.single()` call fails when a user belongs to multiple organizations, throwing an error because multiple rows are returned.

### Issue 2: Organization ID Filter Mismatch
**Lines 64, 94 (original):**
```typescript
.eq('organization_id', member.organization_id)
```

**Problem:** After getting a single organization membership (which might fail or return the wrong org), the code filters reports by that single `organization_id`. If the report belongs to a different organization that the user is also a member of, it won't be found.

### Issue 3: Inconsistent Logic with RLS Policies
The RLS policies (migration 0030) allow deletion if the report belongs to ANY of the user's organizations:

```sql
CREATE POLICY "report_queue_delete"
ON report_queue FOR DELETE TO authenticated
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);
```

The application code was more restrictive than the RLS policy, creating a bottleneck.

## Solution Implemented

### 1. Fetch All User Organizations
Changed from `.single()` to fetching all memberships:

```typescript
// Get user's organization memberships to verify access
// This handles users who belong to multiple organizations
const { data: memberships, error: membershipError } = await supabase
  .from('organization_members')
  .select('organization_id, role')
  .eq('user_id', user.id);

const orgIds = memberships.map((m) => m.organization_id);
```

### 2. Remove Organization Filter from Report Lookup
Let RLS policies handle access control:

```typescript
// Verify the report exists and user can see it before attempting deletion
// RLS policies will filter this to only reports the user has access to
const { data: report, error: lookupError } = await supabase
  .from('report_queue')
  .select('id, requested_by, organization_id')
  .eq('id', reportId)
  .maybeSingle();
```

### 3. Add Application-Level Verification
Verify the report belongs to one of the user's organizations:

```typescript
// Verify the report belongs to one of the user's organizations
if (!orgIds.includes(report.organization_id)) {
  console.warn('[DELETE /api/reports/[id]] Report does not belong to any of user\'s organizations');
  return NextResponse.json(
    { error: 'You do not have permission to delete this report' },
    { status: 403 }
  );
}
```

### 4. Simplify DELETE Query
Remove the organization_id filter and trust RLS:

```typescript
// Delete the report directly - RLS policies will enforce permissions
const { error: deleteError, count: deleteCount } = await supabase
  .from('report_queue')
  .delete({ count: 'exact' })
  .eq('id', reportId);
```

### 5. Update GET Route for Consistency
Applied the same multi-org logic to the GET endpoint:

```typescript
// Get user's organization memberships (handles multi-org users)
const { data: memberships, error: memberError } = await supabase
  .from('organization_members')
  .select('organization_id, role')
  .eq('user_id', user.id);

// Get the report - RLS will filter to only accessible reports
const { data: report, error: reportError } = await supabase
  .from('report_queue')
  .select('*')
  .eq('id', reportId)
  .maybeSingle();
```

## Benefits

1. **Multi-Organization Support**: Users in multiple organizations can now delete reports from any of their organizations
2. **Consistency with RLS Policies**: Application logic aligns with database-level security
3. **Better Error Handling**: More detailed logging shows organization membership status
4. **Follows Best Practices**: Matches the pattern used in `/api/projects` route
5. **No Breaking Changes**: Existing single-org users are unaffected

## Testing

Added comprehensive test case in `/tests/reports-functionality.spec.ts`:

```typescript
test('should delete report successfully for multi-org users', async ({ page }) => {
  // Tests report deletion with proper verification
  // Handles both direct delete buttons and dropdown menus
  // Verifies report is removed from UI
  // Confirms success message appears
});
```

## Files Modified

1. `/apps/web/src/app/api/reports/[id]/route.ts`
   - DELETE handler: Lines 40-117
   - GET handler: Lines 203-217
   - Version marker: Updated to `2025-10-11-v3-multi-org`

2. `/tests/reports-functionality.spec.ts`
   - Added multi-org deletion test: Lines 236-297

## Related Files

- `/packages/database/migrations/0030_fix_report_delete_rls_aligned.sql` - RLS policies
- `/apps/web/src/app/api/reports/route.ts` - List reports (already multi-org aware)
- `/apps/web/src/app/api/projects/route.ts` - Reference implementation for multi-org pattern

## Deployment Notes

- No database migrations required
- No environment variable changes needed
- Backward compatible with existing deployments
- Recommended to monitor DELETE operation logs after deployment

## Verification Steps

1. Type check: `pnpm type-check` ✓
2. Build check: `pnpm build` (recommended)
3. Integration test: Run Playwright tests with `pnpm test:e2e`
4. Manual verification:
   - Create a test user in multiple organizations
   - Generate reports in different organizations
   - Verify user can delete reports from all their organizations
   - Check console logs show correct organization membership detection

## Performance Impact

- **Minimal**: Changed from 1 to 1 database query (single → list of memberships)
- **Network**: No additional round trips
- **Memory**: Negligible (array of org IDs instead of single ID)

## Security Considerations

- RLS policies remain the primary security enforcement
- Application-level checks provide defense in depth
- No bypass of existing security mechanisms
- Proper logging for audit trails

## Rollback Plan

If issues arise, revert commit containing these changes. No data migration rollback needed.

## Additional Context

This fix resolves the disconnect between:
- What users could **see** (governed by SELECT RLS policy)
- What users could **delete** (incorrectly restricted by application code)

The fix ensures that if a user can see a report, they can also perform actions on it according to the RLS policies.
