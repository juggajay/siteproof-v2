# Troubleshooting Report Deletion: Test vs Production

## Problem Statement
Report deletion works in test browser but fails in production browser with "Failed to delete report" error.

## Diagnostic Steps

### 1. Run the Production Database Diagnostic

First, run the diagnostic script in your **PRODUCTION** Supabase SQL Editor:

```bash
# Run the diagnostic script
scripts/diagnose_production_database.sql
```

This will check:
- ✅ Migration 0031 application status
- ✅ RLS policies (especially DELETE)
- ✅ User permissions and context
- ✅ Function definitions
- ✅ Realtime configuration

### 2. Common Environment Differences to Check

#### A. Different Supabase Projects
**Symptom:** Works in one environment but not another

**Check:**
1. Verify the Supabase URL in production `.env`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PRODUCTION_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
   ```

2. Compare with test environment `.env`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_TEST_PROJECT.supabase.co
   ```

3. Verify in browser DevTools:
   - Open Network tab
   - Try to delete a report
   - Check the request URL matches expected project

#### B. Migration Sync Issues
**Symptom:** Migrations applied to test but not production

**Check:**
```sql
-- In PRODUCTION Supabase SQL Editor
SELECT name, executed_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%0031%'
ORDER BY executed_at DESC;
```

**Fix if missing:**
```bash
# Apply migration manually to production
supabase db push --db-url "postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
```

#### C. RLS Policy Conflicts
**Symptom:** Multiple or conflicting DELETE policies

**Check in diagnostic output for:**
- Multiple DELETE policies on report_queue
- Conflicting policy names
- Different policy conditions

**Quick Fix:**
```sql
-- Drop ALL DELETE policies
DROP POLICY IF EXISTS "Users can delete their own reports" ON report_queue;
DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;
DROP POLICY IF EXISTS "Enable delete for users based on organization_id" ON report_queue;

-- Create single correct policy
CREATE POLICY "Users can delete their own reports" ON report_queue
FOR DELETE TO authenticated
USING (
    created_by = auth.uid()
    AND organization_id = current_org_id()
);
```

#### D. User Authentication Context
**Symptom:** Different user roles or missing organization

**Check:**
```sql
-- Check current user context in PRODUCTION
SELECT
    auth.uid() as user_id,
    current_org_id() as organization_id,
    current_user_role() as role;
```

**Verify in application:**
```javascript
// Add this debug code temporarily to RecentReportsList.tsx
console.log('Auth context:', {
  userId: user?.id,
  organizationId: user?.user_metadata?.organization_id,
  role: user?.user_metadata?.role
});
```

#### E. Browser Cache/Session Issues
**Symptom:** Old session or cached policies

**Fix:**
1. Clear browser cache and cookies
2. Sign out and sign back in
3. Check browser DevTools > Application > Local Storage
4. Clear Supabase auth tokens:
   ```javascript
   localStorage.removeItem('supabase.auth.token');
   sessionStorage.clear();
   ```

#### F. Realtime Subscription Issues
**Symptom:** Delete works but UI doesn't update

**Check:**
```sql
-- Check if realtime is enabled
SELECT * FROM pg_publication_tables
WHERE tablename = 'report_queue';
```

**Fix in Supabase Dashboard:**
1. Go to Database > Replication
2. Enable report_queue table for realtime
3. Restart the application

### 3. Database Replication Lag (Supabase Specific)

#### Check for Read Replicas
If using Supabase read replicas:

```sql
-- Check if running on replica
SELECT pg_is_in_recovery();  -- Returns true on replica
```

**Fix:** Ensure DELETE operations hit primary database:
```javascript
// In your API route, force primary connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: { schema: 'public' },
    global: {
      headers: {
        'x-supabase-auth': 'primary'  // Force primary DB
      }
    }
  }
);
```

### 4. Quick Verification Tests

#### Test 1: Direct SQL Delete
```sql
-- Try direct delete in production (replace with actual ID)
DELETE FROM report_queue
WHERE id = 'your-report-id'
  AND created_by = auth.uid()
  AND organization_id = current_org_id();
```

#### Test 2: Check Permissions
```sql
-- Check if current user can see the report
SELECT id, name, created_by = auth.uid() as is_owner
FROM report_queue
WHERE deleted_at IS NULL
  AND organization_id = current_org_id()
LIMIT 5;
```

#### Test 3: Policy Simulation
```sql
-- Simulate what the policy allows
EXPLAIN (ANALYZE, BUFFERS)
DELETE FROM report_queue
WHERE id = 'test-id';
```

### 5. Emergency Workarounds

If you need immediate functionality while debugging:

#### Option A: Temporary Permissive Policy
```sql
-- TEMPORARY - Remove after fixing
CREATE POLICY "temp_delete_own_reports" ON report_queue
FOR DELETE TO authenticated
USING (created_by = auth.uid());
```

#### Option B: Soft Delete Only
Update the API to only soft-delete:
```typescript
// In route.ts - temporary workaround
const { error } = await supabase
  .from('report_queue')
  .update({
    deleted_at: new Date().toISOString(),
    status: 'deleted'
  })
  .eq('id', params.id)
  .eq('created_by', user.id);
```

### 6. Monitoring & Logging

Add temporary logging to identify the exact failure point:

```typescript
// In apps/web/src/app/api/reports/[id]/route.ts
console.log('Delete attempt:', {
  reportId: params.id,
  userId: user.id,
  organizationId: user.user_metadata?.organization_id,
  timestamp: new Date().toISOString()
});

const { error } = await supabase
  .from('report_queue')
  .delete()
  .eq('id', params.id)
  .eq('created_by', user.id);

if (error) {
  console.error('Delete failed:', {
    error: error,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint
  });
}
```

## Resolution Checklist

- [ ] Run diagnostic script in production
- [ ] Verify migration 0031 is applied
- [ ] Check for duplicate DELETE policies
- [ ] Verify environment variables match production
- [ ] Clear browser cache and re-authenticate
- [ ] Check user has correct organization_id
- [ ] Verify realtime is enabled for report_queue
- [ ] Test direct SQL delete in production
- [ ] Add logging to identify exact failure
- [ ] Compare test vs production database schemas

## Contact Support

If all checks pass but the issue persists:

1. **Supabase Support:**
   - Include diagnostic script output
   - Provide project reference ID
   - Share specific error messages

2. **Development Team:**
   - Share browser console errors
   - Network tab HAR file
   - User ID and organization ID
   - Exact timestamp of failed attempts

## Prevention

To prevent future environment discrepancies:

1. **Automate migration deployment:**
   ```json
   // package.json
   "scripts": {
     "migrate:prod": "supabase db push --db-url $PRODUCTION_DATABASE_URL"
   }
   ```

2. **Add health checks:**
   ```typescript
   // Health check endpoint
   async function checkDatabaseHealth() {
     const checks = await supabase.rpc('check_rls_policies');
     return checks;
   }
   ```

3. **Monitor RLS policy changes:**
   - Set up alerts for policy modifications
   - Track migration application status
   - Regular policy audits