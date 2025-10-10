# ITP Assignment Testing Guide

## Recent Fixes
The ITP visibility issue after assignment has been fixed with a multi-layered approach:
1. 300ms delay after assignment API response (commit: 0d25641)
2. Force re-fetch after assignment completion
3. Enhanced error handling and logging

## Manual Testing Steps

### 1. Open the Application
```bash
# Start the development server if not already running
cd apps/web
pnpm dev
```

Navigate to: `http://localhost:3000`

### 2. Login
- Use your credentials to login
- Navigate to the project/site where you want to test ITPs

### 3. Open Browser DevTools
**Press F12** or **Right-click → Inspect**

Go to the **Console** tab - this is where you'll see all the debug logs.

### 4. Test ITP Assignment Flow

#### Step 4.1: Navigate to ITP Management
- Go to the ITP management page for your project
- You should see console logs like:
  ```
  [ITP Debug] Fetching ITPs for projectId: xxx
  [ITP Debug] Fetched X ITPs
  ```

#### Step 4.2: Assign an ITP
1. Select an ITP from the list
2. Assign it to a user/inspector
3. **Watch the console carefully** - you should see:
   ```
   [ITP Debug] Assigning ITP: xxx to inspector: yyy
   [ITP Debug] Assignment successful, waiting 300ms before refetch
   [ITP Debug] Starting refetch after assignment
   [ITP Debug] Fetching ITPs for projectId: xxx
   [ITP Debug] Fetched X ITPs (should include the newly assigned one)
   ```

#### Step 4.3: Verify Visibility
After assignment, the ITP should:
- ✅ Appear in the list immediately (within 300ms)
- ✅ Show the assigned inspector's name
- ✅ Not require a page refresh
- ✅ Persist after page refresh

### 5. What to Look For

#### Success Indicators:
- Console shows "Assignment successful"
- Console shows "Starting refetch after assignment"
- ITP appears in the list within 300ms
- No error messages in console
- Network tab shows successful API calls

#### Failure Indicators:
- Console shows "Assignment failed"
- Network tab shows 4xx/5xx errors
- ITP doesn't appear after assignment
- Console shows cache/refetch errors

## Debug Log Reference

### Key Log Messages

#### Assignment Flow:
```javascript
[ITP Debug] Assigning ITP: {id} to inspector: {inspectorId}
[ITP Debug] Assignment API called with: {params}
[ITP Debug] Assignment response: {response}
[ITP Debug] Assignment successful, waiting 300ms before refetch
[ITP Debug] Starting refetch after assignment
```

#### Fetch Flow:
```javascript
[ITP Debug] Fetching ITPs for projectId: {id}
[ITP Debug] Fetched {count} ITPs
[ITP Debug] ITP fetch error: {error}
```

#### Cache Flow:
```javascript
[ITP Debug] Cache invalidated for project: {id}
[ITP Debug] Force refetching after operation
```

## Common Issues & Solutions

### Issue 1: ITP Doesn't Appear After Assignment
**Check:**
- Browser console for error messages
- Network tab for failed API calls
- Whether the 300ms delay completes

**Solution:**
- Refresh the page manually
- Check if the assignment actually succeeded on the backend
- Verify inspector has proper permissions

### Issue 2: Assignment API Fails
**Check:**
- Console for error details
- Network tab response body
- Backend logs

**Solution:**
- Verify user has permission to assign ITPs
- Check if inspector ID is valid
- Verify project exists and is accessible

### Issue 3: Cache Not Invalidating
**Check:**
- Console for "Cache invalidated" message
- Whether refetch is triggered

**Solution:**
- Clear browser cache
- Check if React Query is configured correctly
- Verify cache keys match between operations

## Testing Checklist

- [ ] ITPs load on page mount
- [ ] Can assign ITP to inspector
- [ ] ITP appears immediately after assignment (within 300ms)
- [ ] Assigned ITP persists after page refresh
- [ ] Can unassign ITP
- [ ] Unassigned ITP disappears from view
- [ ] Console shows no errors
- [ ] All debug logs appear as expected
- [ ] Network requests succeed (200/201 status)
- [ ] Multiple assignments work consecutively

## Browser Console Monitoring

### Enable Verbose Logging
1. Open DevTools (F12)
2. Go to Console tab
3. Enable "Verbose" level logging
4. Clear console (Ctrl+L or click clear icon)
5. Perform the test action

### Export Console Logs
1. Right-click in console
2. Select "Save as..."
3. Save the log file
4. Share for analysis if needed

## Automated Test (Future Enhancement)

For automated testing, we can use Playwright:

```typescript
// Example test structure
test('ITP appears after assignment', async ({ page }) => {
  await page.goto('http://localhost:3000/project/123/itps');

  // Listen for console messages
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(msg.text()));

  // Assign ITP
  await page.click('[data-testid="assign-itp-button"]');
  await page.fill('[data-testid="inspector-select"]', 'inspector-123');
  await page.click('[data-testid="confirm-assign"]');

  // Wait for the ITP to appear (300ms delay + buffer)
  await page.waitForSelector('[data-testid="itp-list-item"]', { timeout: 1000 });

  // Verify console logs
  expect(consoleLogs).toContain('[ITP Debug] Assignment successful');
  expect(consoleLogs).toContain('[ITP Debug] Starting refetch after assignment');
});
```

## Need Help?

If you encounter issues:
1. Capture the full console log output
2. Note the exact steps that led to the issue
3. Check the backend logs for corresponding errors
4. Check the Network tab for API response details

## Recent Code Changes

The fix was implemented in commit `0d25641`:
- Added 300ms delay after assignment before refetch
- Enhanced error handling
- Improved cache invalidation
- Added comprehensive debug logging

Files modified:
- ITP assignment hooks/components (check git log for specific files)
