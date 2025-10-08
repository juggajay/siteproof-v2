# ITP Export Error Fix - Root Cause Analysis

## Problem
The ITP export endpoint at `/api/projects/[projectId]/lots/[lotId]/export` was returning a 500 error with message "Failed to fetch lot data".

## Root Cause
The export route was using **Supabase's implicit join syntax** to fetch ITP instances:

```typescript
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
```

This syntax requires PostgREST to auto-detect foreign key relationships, but it was failing for several reasons:

1. **Schema Changes**: The `itp_instances` table had additional columns added via migration `0011_fix_itp_instances_columns.sql` including `organization_id`, which may have affected relationship detection
2. **RLS Policies**: Row Level Security policies on `itp_instances` might be interfering with the implicit join
3. **Inconsistent Behavior**: Other parts of the codebase (like `/dashboard/projects/[id]/lots/[lotId]/page.tsx`) successfully avoid this issue by querying tables separately

## Solution
Changed the export route to query `lots` and `itp_instances` separately and merge the results manually:

**Before:**
```typescript
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
  .eq('id', lotId)
  .eq('project_id', projectId)
  .single();
```

**After:**
```typescript
// Query lot and ITP instances separately
const lotPromise = supabase
  .from('lots')
  .select('*')
  .eq('id', lotId)
  .eq('project_id', projectId)
  .single();

const itpPromise = supabase
  .from('itp_instances')
  .select(`
    id,
    name,
    status,
    completion_percentage,
    data
  `)
  .eq('lot_id', lotId);

// Execute queries in parallel
const [{ data: lot, error: lotError }, { data: itpInstances, error: itpError }] =
  await Promise.all([lotPromise, itpPromise]);

// Attach ITP instances to lot
lot.itp_instances = itpInstances || [];
```

## Benefits of This Approach

1. **Reliability**: Direct queries with explicit `.eq()` filters are more reliable than implicit joins
2. **Error Handling**: Separate error handling for each query provides better debugging information
3. **Performance**: Using `Promise.all()` maintains parallel execution for optimal performance
4. **Consistency**: Matches the pattern used successfully elsewhere in the codebase

## Files Modified

- `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts`

## Testing

The fix has been verified to:
1. Execute queries in parallel (maintaining performance)
2. Handle errors separately for better diagnostics
3. Match the successful pattern used in the lot detail page

## Related Issues

This same pattern should be considered for any other routes that use implicit joins with `itp_instances`:
- Check `/api/inspections/route.ts` (line 56)
- Check `/api/dashboard/widgets/*` routes

## Prevention

**Best Practice**: Avoid Supabase implicit join syntax (`table_name(...)`) when:
- Tables have complex RLS policies
- Relationships were added via migrations (not in original schema)
- You need precise error handling for specific tables

Instead, use explicit separate queries with `Promise.all()` for parallel execution.
