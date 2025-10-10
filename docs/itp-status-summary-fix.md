# ITP Status Summary Fix - Root Cause Analysis and Solution

## Issue Description
The status summary (pass/fail/na counts with icons) was not appearing in the ITP card headers on the lot detail page, even after the feature was implemented in commit `22adce3`.

## Root Cause

The bug was in the status count calculation logic at lines 267-287 of `/home/jayso/projects/siteproof-v2/apps/web/src/components/itp/basic-itp-manager.tsx`.

### The Problem

The original implementation counted items from `instance.data` (inspection results), but:

1. **When an ITP is first assigned**, `instance.data` is empty (`{}`), so all counts were 0
2. **When partially filled**, it only counted filled items, missing unfilled ones
3. **The calculation didn't reference the template structure** to know how many items should exist

This resulted in showing "0 0 0" for new ITPs, which appeared invisible or broken.

### Evidence

Test results showed:
- Empty ITP: Expected 2 pending items, got 0/0/0/0
- Partially filled ITP: Expected 1 pass + 2 pending, got 1 pass only

## Solution

### Code Changes

Changed the calculation to iterate through the **template structure** instead of just the inspection results:

```typescript
// OLD (BUGGY) - Only counted filled items
Object.values(inspectionResults).forEach((section: any) => {
  // Only iterates over filled sections...
});

// NEW (FIXED) - Counts all items from template structure
sections.forEach((section: any, sectionIndex: number) => {
  const sectionItems = section.items || (section.id ? [section] : []);
  sectionItems.forEach((item: any, itemIndex: number) => {
    const currentStatus = inspectionResults?.[sectionId]?.[itemId]?.result;
    if (currentStatus === 'pass') counts.pass++;
    else if (currentStatus === 'fail') counts.fail++;
    else if (currentStatus === 'na') counts.na++;
    else counts.pending++; // Items without status are pending
  });
});
```

### UI Improvements

1. **Conditional rendering**: Only show status summary when template has items
2. **Added pending count**: Shows "X pending" when items haven't been filled
3. **Better styling**: Added `font-medium` for better visibility
4. **Guard clause**: Prevents showing 0/0/0 for empty templates

### Files Modified

- `/home/jayso/projects/siteproof-v2/apps/web/src/components/itp/basic-itp-manager.tsx`
  - Lines 267-289: Fixed status count calculation
  - Lines 329-351: Improved UI with conditional rendering

### Test Coverage

Created `/home/jayso/projects/siteproof-v2/tests/itp-status-counts-test.ts` to verify:
- Empty ITPs show correct pending count
- Partially filled ITPs count both filled and unfilled items
- Fully filled ITPs show accurate pass/fail/na counts

All tests pass ✓

## Expected Behavior After Fix

1. **New ITP (not started)**: Shows `✓0 ✗0 −0 • X pending`
2. **In Progress ITP**: Shows actual counts like `✓5 ✗2 −1 • 3 pending`
3. **Completed ITP**: Shows `✓8 ✗0 −2` (no pending)
4. **Empty template**: Status summary hidden (shows "No items" badge)

## Verification Steps

1. Navigate to a lot detail page with ITPs
2. Check that ITP cards show status summary in the header
3. Verify counts match actual inspection items
4. Confirm pending items are tracked correctly
5. Check that the summary updates when marking items

## Related Commits

- `22adce3` - Original implementation (incomplete)
- Current fix - Corrects the calculation logic

## Prevention

To prevent similar issues:
1. Always test with empty/new data states
2. Reference source of truth (template structure) not derived data
3. Add unit tests for calculation logic
4. Include visual regression tests for UI components
