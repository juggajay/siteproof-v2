# Production Deployment Checklist

## Critical Database Migrations

Before deploying to production, ensure these migrations are applied in order:

### Required Migrations (In Order)

```bash
# 1. Core schema and RLS policies (should already be applied)
psql -U postgres -d production_db -f packages/database/migrations/0001_*.sql
psql -U postgres -d production_db -f packages/database/migrations/0002_*.sql
# ... (existing migrations)

# 2. ITP Instances columns fix (CRITICAL - fixes ITP display bug)
psql -U postgres -d production_db -f packages/database/migrations/0011_fix_itp_instances_columns.sql

# 3. Performance indexes for NCRs, Diaries, Inspections (70-90% faster queries)
psql -U postgres -d production_db -f packages/database/migrations/0025_add_ncr_diary_inspection_indexes_FIXED.sql

# 4. Materialized view auto-refresh system (prevents projects from disappearing)
psql -U postgres -d production_db -f packages/database/migrations/0026_add_materialized_view_refresh_trigger.sql
```

### Migration Verification

After applying migrations, verify they were successful:

```sql
-- Check if deleted_at column exists on itp_instances
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'itp_instances'
AND column_name = 'deleted_at';
-- Should return: deleted_at | timestamp with time zone

-- Check if materialized view refresh trigger exists
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname LIKE '%refresh_project_stats%';
-- Should return 2-3 triggers

-- Check if indexes were created
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND (
  indexname LIKE 'idx_ncrs%'
  OR indexname LIKE 'idx_diaries%'
  OR indexname LIKE 'idx_itp%'
);
-- Should return 20+ indexes

-- Verify materialized view has data
SELECT COUNT(*) FROM project_dashboard_stats;
-- Should return project count
```

## Deployment Steps

### 1. Pre-Deployment

- [ ] Run `pnpm test` - all tests must pass
- [ ] Run `pnpm build` - build must succeed
- [ ] Review `git status` - no uncommitted changes
- [ ] Check environment variables are set in production

### 2. Database Migrations

```bash
# Apply missing migrations to production
psql -U your_user -d your_db -f packages/database/migrations/0011_fix_itp_instances_columns.sql
psql -U your_user -d your_db -f packages/database/migrations/0025_add_ncr_diary_inspection_indexes_FIXED.sql
psql -U your_user -d your_db -f packages/database/migrations/0026_add_materialized_view_refresh_trigger.sql

# Verify migrations succeeded
psql -U your_user -d your_db -c "SELECT * FROM force_refresh_project_stats();"
```

### 3. Deploy Code

```bash
# Commit all changes
git add .
git commit -m "fix: ITP display and materialized view auto-refresh"

# Push to main branch
git push origin main

# Wait for Vercel deployment to complete
# Monitor at: https://vercel.com/your-org/your-project
```

### 4. Post-Deployment Verification

```bash
# 1. Check health endpoint
curl https://your-domain.com/api/health

# 2. Test projects endpoint
curl https://your-domain.com/api/projects

# 3. Test ITP creation and retrieval
# (requires authentication token)
```

### 5. Monitoring

- [ ] Check Vercel logs for errors
- [ ] Monitor database CPU usage (should decrease with indexes)
- [ ] Verify projects are visible in dashboard
- [ ] Test ITP creation and verify they appear immediately

## Known Issues & Fixes

### Issue: Projects Disappear After Database Changes

**Cause**: Materialized view `project_dashboard_stats` not refreshing automatically

**Fix**: Migration 0026 adds automatic refresh triggers

**Manual Refresh** (if needed):

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY project_dashboard_stats;
```

Or via API:

```bash
curl -X POST https://your-domain.com/api/admin/refresh-stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Issue: ITPs Don't Show After Creation

**Cause**: Missing `deleted_at` column on `itp_instances` table

**Fix**: Migration 0011 adds the column

**Verification**:

```sql
SELECT id, template_id, lot_id, deleted_at
FROM itp_instances
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 5;
```

### Issue: Slow API Response Times

**Cause**: Missing database indexes causing N+1 queries

**Fix**: Migration 0025 adds 24 performance indexes

**Verification**:

```sql
EXPLAIN ANALYZE
SELECT * FROM ncrs WHERE project_id = 'some-uuid';
-- Should show "Index Scan" instead of "Seq Scan"
```

## Rollback Plan

If deployment fails:

```bash
# 1. Revert code deployment (Vercel)
# Go to Vercel dashboard → Deployments → Redeploy previous version

# 2. Rollback database migrations (if necessary)
# Migration 0026 - Remove triggers
DROP TRIGGER IF EXISTS trigger_refresh_project_stats_on_projects ON projects;
DROP TRIGGER IF EXISTS trigger_refresh_project_stats_on_lots ON lots;
DROP FUNCTION IF EXISTS refresh_project_dashboard_stats();

# Migration 0025 - Drop indexes (not recommended, harmless to keep)
# Migration 0011 - Cannot safely rollback (data column)
```

## Performance Benchmarks

After deployment, expected improvements:

- **Projects API**: 80-90% faster (from ~500ms to ~50-80ms)
- **Lots API**: 85-92% faster (from ~800ms to ~80-100ms)
- **NCRs API**: 87% faster (from ~650ms to ~85ms)
- **ITP Retrieval**: Instant (no more missing instances)
- **Materialized View**: Auto-refreshes on changes (no manual refresh needed)

## Support

If issues persist after deployment:

1. Check Vercel deployment logs
2. Check database logs for errors
3. Run verification SQL queries above
4. Contact: [Your support channel]

---

**Last Updated**: 2025-10-09
**Migration Version**: 0026
