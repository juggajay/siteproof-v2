# ITP Query Optimization Implementation Guide

## Overview

This guide provides step-by-step instructions to implement the ITP query optimization that eliminates the N+1 query problem and improves performance by ~75%.

## Changes Summary

### Database Changes

- **File**: `packages/database/migrations/0023_optimize_itp_queries.sql`
- **Type**: New indexes (covering, composite, partial)
- **Risk**: Low (indexes only, no schema changes)

### Code Changes

- **File**: `apps/web/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.ts`
- **Type**: Query optimization (eliminate N+1 pattern)
- **Risk**: Medium (query logic change, RLS validation required)

## Implementation Steps

### Step 1: Apply Database Migration

```bash
cd packages/database

# Review the migration file first
cat migrations/0023_optimize_itp_queries.sql

# Apply migration via Supabase CLI or dashboard
# Option A: Supabase CLI
supabase db push

# Option B: Manual (run in Supabase SQL Editor)
# Copy contents of 0023_optimize_itp_queries.sql
# Paste into SQL Editor and run
```

**Validation**:

```sql
-- Verify indexes were created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('itp_instances', 'itp_templates')
  AND indexname LIKE '%0023%' OR indexname LIKE '%lot_template_status%'
ORDER BY tablename, indexname;

-- Check index sizes
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE tablename = 'itp_instances'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

### Step 2: Test Optimized Query in Development

```bash
cd apps/web

# Start development server
pnpm dev
```

**Manual Test**:

1. Navigate to a lot with 10+ ITP instances
2. Open browser DevTools → Network tab
3. Filter by "itp" to see the API call
4. Check response time

**Before Optimization**:

- Look for 2 separate queries in Supabase logs
- Response time: ~800ms for 50 ITPs

**After Optimization**:

- Single query with JOIN
- Response time: ~200ms for 50 ITPs

### Step 3: Verify Query Plan

Use Supabase SQL Editor to check the query plan:

```sql
-- Replace <lot-id> with actual UUID
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  itp_instances.*,
  row_to_json(itp_templates.*) as itp_templates,
  row_to_json(projects.*) as projects
FROM itp_instances
LEFT JOIN itp_templates ON itp_instances.template_id = itp_templates.id
INNER JOIN projects ON itp_instances.project_id = projects.id
WHERE itp_instances.lot_id = '<lot-id>'
  AND itp_instances.deleted_at IS NULL
ORDER BY itp_instances.created_at DESC;
```

**Look For**:

- ✓ Index Scan on `idx_itp_instances_lot_template_status`
- ✓ Nested Loop with small row counts
- ✗ Sequential Scan (indicates index not used)
- ✗ Hash Join with large tables (inefficient)

**Good Example**:

```
Index Scan using idx_itp_instances_lot_template_status on itp_instances
  (cost=0.42..123.45 rows=50 width=1234)
  Index Cond: (lot_id = '<lot-id>')
  Filter: (deleted_at IS NULL)
  Buffers: shared hit=15
```

**Bad Example**:

```
Seq Scan on itp_instances
  (cost=0.00..10000.00 rows=50000 width=1234)
  Filter: (lot_id = '<lot-id>' AND deleted_at IS NULL)
  Buffers: shared hit=5000
```

### Step 4: Update Production Code

**Option A: Direct Replacement** (Recommended)

```bash
# Backup current file
cp apps/web/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.ts \
   apps/web/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.ts.backup

# Replace with optimized version
cp apps/web/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.optimized.ts \
   apps/web/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.ts
```

**Option B: Manual Merge**

Replace the GET function (lines 4-113) with the optimized version:

<details>
<summary>View Diff</summary>

```diff
  export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ projectId: string; lotId: string }> }
  ) {
    try {
      const supabase = await createClient();

      // Check authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { lotId } = await params;

      console.log('[ITP API] Fetching instances for lot:', lotId);

-     // Fetch with projects join to satisfy RLS policy
-     // The RLS policy requires an explicit join with projects table
+     // OPTIMIZED: Single query with template JOIN instead of N+1 pattern
+     // This eliminates the separate template fetch and client-side mapping
      const { data: itpInstances, error: instancesError } = await supabase
        .from('itp_instances')
-       .select('*, projects!inner(id, organization_id)')
+       .select(
+         `
+         *,
+         itp_templates (
+           id,
+           name,
+           description,
+           category,
+           structure,
+           is_active,
+           version
+         ),
+         projects!inner (
+           id
+         )
+       `
+       )
        .eq('lot_id', lotId)
+       .is('deleted_at', null) // Filter soft-deleted instances
        .order('created_at', { ascending: false });

      if (instancesError) {
        console.error('[ITP API] Error fetching instances:', instancesError);
        return NextResponse.json(
          {
            error: 'Failed to fetch ITP instances',
            details: instancesError.message,
          },
          { status: 500 }
        );
      }

      console.log('[ITP API] Found instances:', itpInstances?.length || 0);

-     // Clean up instances - remove nested projects object added for RLS
+     // Clean up instances - remove nested projects object (only used for RLS)
+     // Template data is now properly nested, no mapping needed
      const cleanedInstances = (itpInstances || []).map((itp: any) => {
        const { projects, ...cleanedItp } = itp;
        return cleanedItp;
      });

-     // If we have instances, try to fetch their templates separately
-     const instancesWithTemplates = [];
-
-     if (cleanedInstances && cleanedInstances.length > 0) {
-       // Get unique template IDs
-       const templateIds = [...new Set(cleanedInstances.map((i) => i.template_id).filter(Boolean))];
-
-       if (templateIds.length > 0) {
-         console.log('[ITP API] Fetching templates:', templateIds);
-
-         const { data: templates, error: templatesError } = await supabase
-           .from('itp_templates')
-           .select('*')
-           .in('id', templateIds);
-
-         if (templatesError) {
-           console.error('[ITP API] Error fetching templates:', templatesError);
-           // Continue without template data
-           for (const instance of cleanedInstances) {
-             instancesWithTemplates.push({
-               ...instance,
-               itp_templates: null,
-             });
-           }
-         } else {
-           console.log('[ITP API] Found templates:', templates?.length || 0);
-
-           // Map templates to instances
-           const templateMap = new Map(templates?.map((t) => [t.id, t]) || []);
-
-           for (const instance of cleanedInstances) {
-             instancesWithTemplates.push({
-               ...instance,
-               itp_templates: templateMap.get(instance.template_id) || null,
-             });
-           }
-         }
-       } else {
-         // No template IDs, just return instances as is
-         for (const instance of cleanedInstances) {
-           instancesWithTemplates.push({
-             ...instance,
-             itp_templates: null,
-           });
-         }
-       }
-     }

-     console.log('[ITP API] Returning instances:', instancesWithTemplates.length);
+     console.log('[ITP API] Returning instances:', cleanedInstances.length);

-     // Return instances in the format expected by the frontend
-     return NextResponse.json({ instances: instancesWithTemplates });
+     // Return instances in the format expected by the frontend
+     // Template data is already included via the join
+     return NextResponse.json({ instances: cleanedInstances });
    } catch (error) {
      console.error('[ITP API] Unexpected error:', error);
      console.error('[ITP API] Error stack:', error instanceof Error ? error.stack : 'No stack');
      return NextResponse.json(
        {
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
```

</details>

### Step 5: RLS Validation

Test multi-tenant isolation is still working:

```typescript
// Test 1: User from Organization A cannot see Organization B's ITPs
// Test 2: User with 'viewer' role can read but not modify
// Test 3: Deleted ITPs are not returned
```

**Manual Test Cases**:

1. Sign in as user from Org A
2. Navigate to Lot in Org A → Should see ITPs ✓
3. Try accessing Lot ID from Org B → Should get 401/404 ✓
4. Sign out and sign in as Org B user
5. Navigate to Lot in Org B → Should see ITPs ✓
6. Should NOT see any Org A data ✓

### Step 6: Performance Testing

**Load Test Script**:

```javascript
// tests/performance/itp-query-load-test.js
const { performance } = require('perf_hooks');

async function testItpQuery(lotId, iterations = 10) {
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    await fetch(`/api/projects/${projectId}/lots/${lotId}/itp`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const end = performance.now();
    times.push(end - start);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

  console.log(`Average: ${avg.toFixed(2)}ms`);
  console.log(`P95: ${p95.toFixed(2)}ms`);
  console.log(`Min: ${Math.min(...times).toFixed(2)}ms`);
  console.log(`Max: ${Math.max(...times).toFixed(2)}ms`);
}

// Run test
testItpQuery('your-lot-id-with-50-itps');
```

**Expected Results**:

- Average: < 300ms (previously ~800ms)
- P95: < 500ms (previously ~1200ms)
- Min: < 150ms (previously ~600ms)

### Step 7: Production Deployment

```bash
# 1. Commit changes
git add packages/database/migrations/0023_optimize_itp_queries.sql
git add apps/web/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.ts
git add docs/performance/

git commit -m "perf: optimize ITP query to eliminate N+1 pattern

- Add covering indexes for common query patterns
- Eliminate N+1 query by using JOIN instead of separate template fetch
- Remove client-side mapping overhead
- Add soft-delete filtering
- Expected 75% performance improvement

Migration: 0023_optimize_itp_queries.sql
Issue: #XXX"

# 2. Push to feature branch
git push origin feature/optimize-itp-queries

# 3. Create PR and request review

# 4. After approval, merge to main

# 5. Monitor production deployment
# - Check error rates in Sentry
# - Monitor query performance in Supabase Dashboard
# - Watch connection pool metrics
```

## Monitoring

### Key Metrics to Track

1. **Query Performance** (Supabase Dashboard)
   - Query execution time (target: < 300ms)
   - Number of queries per request (should be 1)

2. **Error Rates** (Sentry/Application Logs)
   - Watch for RLS permission errors
   - Check for template join failures

3. **Connection Pool** (Application Logs)
   - Pool utilization (should decrease)
   - Connection wait time

4. **User Experience** (Frontend)
   - Page load time for lot details
   - Dashboard widget load time

### Rollback Procedure

If issues are detected:

**Database Rollback**:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_itp_instances_lot_template_status;
DROP INDEX IF EXISTS idx_itp_templates_id_org;
DROP INDEX IF EXISTS idx_itp_instances_project_lot;
DROP INDEX IF EXISTS idx_itp_instances_created_by_date;
DROP INDEX IF EXISTS idx_itp_instances_active;
```

**Code Rollback**:

```bash
# Restore from backup
cp apps/web/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.ts.backup \
   apps/web/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.ts

# Or git revert
git revert <commit-hash>
git push origin main
```

## Success Criteria

- ✓ Query response time < 300ms for 50 ITPs
- ✓ Single database query instead of 2
- ✓ No RLS permission errors
- ✓ Multi-tenant isolation verified
- ✓ No increase in error rates
- ✓ Reduced connection pool usage

## Troubleshooting

### Issue: Index not being used

**Check**:

```sql
EXPLAIN SELECT * FROM itp_instances WHERE lot_id = '...';
```

**Fix**: Run `ANALYZE itp_instances;`

### Issue: Template data not appearing

**Check**: Frontend expects `itp_templates` field
**Fix**: Ensure query uses correct relation name

### Issue: RLS permission errors

**Check**: Projects join is required
**Fix**: Ensure `projects!inner` is in select

---

**Questions?** Check `docs/performance/itp-query-optimization-report.md` for detailed analysis.
