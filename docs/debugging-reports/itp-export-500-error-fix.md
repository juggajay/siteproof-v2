# ITP Export 500 Error Fix

## Issue Summary

The ITP export endpoint was returning a 500 Internal Server Error with the message "Failed to fetch ITP instances" when users tried to export lot data.

## Root Cause Analysis

### Error Location

- **File**: `/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts`
- **Lines**: 49, 100

### Problem Details

The export route was using an incorrect column name when querying the `itp_instances` table:

1. **Line 49** - Select Query Issue:

   ```typescript
   // INCORRECT - Using 'status' column
   .select('id, name, status, completion_percentage, data, project_id, projects!inner(id, organization_id)')
   ```

   The database schema uses `inspection_status` as the column name, not `status`.

2. **Line 100** - Filter Issue:
   ```typescript
   // INCORRECT - Filtering by 'status' field
   lot.itp_instances?.filter((itp: any) => itp.status === 'completed');
   ```
   This filter was checking a non-existent field.

### Schema Investigation

From migration file `0011_fix_itp_instances_columns.sql`:

```sql
ALTER TABLE itp_instances
ADD COLUMN IF NOT EXISTS inspection_status VARCHAR(50) DEFAULT 'pending';

COMMENT ON COLUMN itp_instances.inspection_status IS 'Current inspection status: pending, in_progress, completed, approved';
```

The correct column name is `inspection_status`, which was confirmed by checking other working API routes like `/api/dashboard/widgets/active-itps/route.ts`.

## Fix Applied

### Change 1: Select Query

**File**: `/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts`
**Line**: 49

```typescript
// BEFORE (Line 49)
.select('id, name, status, completion_percentage, data, project_id, projects!inner(id, organization_id)')

// AFTER
.select('id, name, inspection_status, completion_percentage, data, project_id, projects!inner(id, organization_id)')
```

### Change 2: Filter Logic

**File**: `/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts`
**Line**: 100

```typescript
// BEFORE (Line 100)
lot.itp_instances?.filter((itp: any) => itp.status === 'completed');

// AFTER
lot.itp_instances?.filter((itp: any) => itp.inspection_status === 'completed');
```

## Testing

### Verification Steps

1. ✅ Verified correct column name from database migration files
2. ✅ Confirmed usage in other working API routes
3. ✅ Updated both the select query and filter logic
4. ✅ Ensured authentication still works correctly (401 response without auth)

### Expected Behavior After Fix

- Export endpoint should successfully fetch ITP instances
- Completed ITP count should be calculated correctly
- Response should return success with proper ITP data

## Related Files

- `/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts` - Fixed file
- `/packages/database/migrations/0011_fix_itp_instances_columns.sql` - Schema definition
- `/apps/web/src/app/api/dashboard/widgets/active-itps/route.ts` - Reference implementation

## Prevention

To prevent similar issues in the future:

1. Always check database schema/migrations when adding new queries
2. Use TypeScript types for database models to catch column name mismatches
3. Add integration tests for API endpoints
4. Review other endpoints when column names change

## Impact

- **Severity**: High (blocked critical export functionality)
- **Users Affected**: All users trying to export lot data
- **Resolution Time**: < 30 minutes after bug report

## Date

2025-10-09
