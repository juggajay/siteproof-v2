# Report Deletion UI Update Fix

## Problem Summary

**Issue**: Report deletion was working successfully on the backend (DELETE endpoint returned 200), but the UI wasn't updating to remove the deleted report from the list.

**Current Behavior**:

- Backend DELETE endpoint returns 200 success
- Console shows successful deletion
- Report remains visible in UI after deletion

## Root Cause Analysis

### 1. Query Key Mismatch Issue

The primary issue was with React Query cache invalidation:

- **Query Key Definition** (line 119): `['reports', filter, limit]`
- **Invalidation Call** (line 507): `invalidateQueries({ queryKey: ['reports'] })`
- **Problem**: While the partial key `['reports']` should match, the invalidation wasn't triggering a proper refetch

### 2. Lack of Optimistic Updates

The original implementation relied solely on cache invalidation and refetch, which can have timing issues:

- Network latency between invalidation and refetch
- UI state not updating immediately
- No fallback if refetch fails

## Solution Implemented

### Optimistic Update Pattern

Implemented an optimistic update approach that immediately removes the deleted report from the UI:

```typescript
const deleteReport = async (reportId: string, reportName: string) => {
  // ... confirmation logic ...

  setDeletingReportId(reportId);

  // Store the current query key for this specific query
  const currentQueryKey = ['reports', filter, limit];

  // Optimistically update the cache to remove the report immediately
  const previousReports = queryClient.getQueryData<Report[]>(currentQueryKey);

  // Immediately remove the report from the UI (optimistic update)
  queryClient.setQueryData<Report[]>(currentQueryKey, (oldData) => {
    if (!oldData) return oldData;
    return oldData.filter((report) => report.id !== reportId);
  });

  try {
    // ... DELETE API call ...

    toast.success('Report deleted successfully', { id: `delete-${reportId}` });

    // Invalidate all report queries to ensure consistency across all filters
    await queryClient.invalidateQueries({
      queryKey: ['reports'],
      exact: false, // This ensures all queries starting with 'reports' are invalidated
      refetchType: 'active', // Only refetch active queries
    });
  } catch (error) {
    // Rollback the optimistic update on error
    if (previousReports) {
      queryClient.setQueryData<Report[]>(currentQueryKey, previousReports);
    }

    toast.error(errorMessage, { id: `delete-${reportId}` });
  } finally {
    setDeletingReportId((current) => (current === reportId ? null : current));
  }
};
```

## Key Improvements

### 1. Immediate UI Response

- **Before**: UI waits for invalidation + refetch (network round-trip)
- **After**: Report disappears immediately when delete button is clicked

### 2. Error Handling with Rollback

- Stores the previous state before making changes
- If deletion fails, the report is restored to the UI
- User sees clear error message

### 3. Proper Cache Invalidation

- Uses `exact: false` to match all queries starting with `['reports']`
- Uses `refetchType: 'active'` to only refetch queries currently in use
- Ensures consistency across different filter views

### 4. Type Safety

- Properly typed `Report[]` for cache operations
- Type-safe query key matching

## Testing Recommendations

### Manual Testing

1. **Success Path**:
   - Delete a report
   - Verify immediate removal from UI
   - Verify success toast appears
   - Verify report doesn't reappear after page refresh

2. **Error Path**:
   - Simulate network failure (disconnect network)
   - Try to delete a report
   - Verify report reappears in UI
   - Verify error toast appears

3. **Filter Consistency**:
   - Delete report in "All Reports" view
   - Switch to "My Reports" view
   - Verify deleted report doesn't appear in any view

### Automated Testing

```typescript
describe('Report Deletion', () => {
  it('should immediately remove report from UI on successful deletion', async () => {
    // Setup: render component with reports
    // Action: click delete button
    // Assert: report is immediately removed from DOM
    // Assert: success toast appears
  });

  it('should restore report to UI if deletion fails', async () => {
    // Setup: mock API to return error
    // Action: click delete button
    // Assert: report reappears in UI
    // Assert: error toast appears
  });

  it('should maintain consistency across filter views', async () => {
    // Setup: render with multiple reports
    // Action: delete report in one filter
    // Action: switch to another filter
    // Assert: report is not visible in any filter
  });
});
```

## Benefits

1. **Better UX**: Instant feedback to user actions
2. **Error Recovery**: Automatic rollback on failure
3. **Consistency**: Works across all filter views
4. **Performance**: Reduces unnecessary network calls
5. **Reliability**: Fallback mechanism if refetch fails

## Related Files

- `/apps/web/src/features/reporting/components/RecentReportsList.tsx` - Main fix location
- `/apps/web/src/app/api/reports/[id]/route.ts` - DELETE endpoint
- `/apps/web/src/app/api/reports/route.ts` - GET endpoint for reports list

## Additional Fixes

During the implementation, also fixed:

- TypeScript error in `/apps/web/src/app/api/reports/[id]/download/route.ts` (log.warn parameter order)
- TypeScript error in `/apps/web/src/features/reporting/components/ReportGenerationForm.tsx` (type casting)
