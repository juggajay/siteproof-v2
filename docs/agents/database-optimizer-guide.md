# Database Optimizer Agent Guide

## Overview

The `database-optimizer` agent is a specialized AI agent for optimizing SiteProof v2's Supabase/PostgreSQL database. It has deep context about your database architecture, current optimizations, known issues, and construction management data patterns.

## When to Use

The database-optimizer agent should be used **proactively** for:

### Performance Issues
- ✅ Slow API endpoints or queries
- ✅ High database connection usage
- ✅ Timeout errors in production
- ✅ Dashboard loading slowly
- ✅ Export generation taking too long

### Query Optimization
- ✅ N+1 query problems
- ✅ Missing indexes
- ✅ Inefficient JOINs
- ✅ JSONB query performance
- ✅ RLS policy overhead

### Scaling Challenges
- ✅ Growing table sizes
- ✅ Connection pool saturation
- ✅ Offline sync performance degradation
- ✅ Multi-tenant query isolation

### Database Design
- ✅ Adding new indexes
- ✅ Optimizing existing schemas
- ✅ Partitioning strategies
- ✅ Caching layer design

## Agent Context

The database-optimizer agent has comprehensive knowledge of:

### SiteProof v2 Database
- All 38+ migration files and their history
- Current index strategy (0010_add_performance_indexes.sql)
- RLS policies and multi-tenant architecture
- Connection pooling configuration
- JSONB field usage patterns
- Known performance issues from git history

### Construction Domain
- ITP workflow (templates → instances → inspections)
- Daily diary cost calculations
- NCR workflow status transitions
- Offline-first inspection sync
- Role-based cost visibility
- Weather data integration

### Technology Stack
- Supabase (PostgreSQL 15+)
- Connection pool configuration (20 max, 5 min)
- RLS-based multi-tenancy
- JSONB for flexible schemas
- Background job processing (Trigger.dev)
- Real-time subscriptions

## How to Use

### Basic Invocation

```typescript
// Using Task tool in Claude Code
Task({
  subagent_type: "database-optimizer",
  description: "Optimize slow ITP query",
  prompt: `
    The ITP instances list query is taking 3+ seconds on lots with 50+ ITPs.
    Current query in: apps/web/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.ts

    Please analyze and optimize:
    1. Identify bottlenecks using EXPLAIN ANALYZE
    2. Check for N+1 queries
    3. Validate index usage
    4. Optimize RLS policies if needed
    5. Provide migration file for new indexes
  `
})
```

### Example Use Cases

#### 1. Optimize Slow Dashboard Query

```typescript
Task({
  subagent_type: "database-optimizer",
  prompt: `
    Dashboard project summary widget is slow (5+ seconds).
    File: apps/web/src/app/api/dashboard/widgets/project-summary/route.ts

    Optimize the aggregation query that calculates:
    - Total projects by organization
    - Active ITPs count
    - Pending NCRs count
    - Recent diary entries

    Ensure multi-tenant RLS works correctly.
  `
})
```

#### 2. Fix N+1 Query Problem

```typescript
Task({
  subagent_type: "database-optimizer",
  prompt: `
    ITP instances are loading with N+1 queries for templates and projects.
    File: apps/web/src/features/itp/hooks/useItpInstances.ts

    1. Analyze current query pattern
    2. Add eager loading for relationships
    3. Validate RLS compliance
    4. Test with 100+ ITP instances
  `
})
```

#### 3. Optimize Diary Export

```typescript
Task({
  subagent_type: "database-optimizer",
  prompt: `
    Daily diary PDF export is timing out with 50+ labor/plant/material entries.
    File: apps/web/src/app/api/diaries/[id]/export/route.ts

    Optimize the query that aggregates:
    - diary_labor with worker details and rates
    - diary_plant with plant details and rates
    - diary_materials with supplier info

    Consider role-based cost visibility (hide_costs_from_foreman).
  `
})
```

#### 4. Design Caching Strategy

```typescript
Task({
  subagent_type: "database-optimizer",
  prompt: `
    ITP templates are read frequently but rarely updated.
    Design a caching strategy:

    1. Identify cache invalidation triggers
    2. Recommend caching layer (Redis, in-memory)
    3. Handle multi-tenant cache isolation
    4. Provide implementation approach
  `
})
```

#### 5. Optimize Offline Sync

```typescript
Task({
  subagent_type: "database-optimizer",
  prompt: `
    Offline inspection sync is slow when reconnecting with 20+ inspections.
    File: apps/web/src/features/inspections/hooks/useInspectionSync.ts

    Optimize:
    1. Conflict detection queries
    2. Batch sync operations
    3. Version comparison performance
    4. Reduce roundtrips to database
  `
})
```

## Expected Deliverables

When you invoke the database-optimizer agent, expect:

### 1. Analysis Report
- Current query performance (EXPLAIN ANALYZE results)
- Identified bottlenecks
- Index usage analysis
- RLS policy impact assessment

### 2. Optimization Recommendations
- Specific index additions
- Query rewrites
- RLS policy adjustments
- Connection pool tuning

### 3. Implementation Files
- **Migration file**: `packages/database/migrations/XXXX_optimize_feature.sql`
- **Updated queries**: Modified API route files
- **Documentation**: Performance improvement notes

### 4. Testing Guidance
- Test scenarios to validate optimization
- Expected performance improvements
- Rollback procedures if needed

## Integration with SiteProof v2 Workflow

### Before Running Agent
1. ✅ Identify slow endpoint or query
2. ✅ Gather performance metrics (query time, connection usage)
3. ✅ Note any error logs or timeouts
4. ✅ Identify affected file(s)

### During Agent Execution
1. Agent analyzes current implementation
2. Agent checks existing indexes and RLS policies
3. Agent generates optimization strategy
4. Agent provides migration files and code updates

### After Agent Completion
1. ✅ Review generated migration file
2. ✅ Test in development environment
3. ✅ Run migration: `cd packages/database && npx supabase migration run`
4. ✅ Test affected endpoints
5. ✅ Monitor performance improvement
6. ✅ Deploy to production

## Best Practices

### 1. Provide Context
Always include:
- File paths to affected code
- Current query/endpoint
- Performance metrics (query time, error rate)
- Any recent changes that may have caused regression

### 2. Be Specific
Instead of: "Database is slow"
Use: "ITP list endpoint at /api/projects/[projectId]/lots/[lotId]/itp takes 3+ seconds with 50 ITPs"

### 3. Request Measurable Improvements
Ask for:
- Target query time reduction
- EXPLAIN ANALYZE before/after
- Index hit rate improvements
- Connection usage reduction

### 4. Consider Trade-offs
Ask agent to explain:
- Storage overhead of new indexes
- RLS policy security implications
- Maintenance burden of optimizations
- Potential query plan regressions

## Common Optimization Patterns

### Pattern 1: Missing Index
**Symptom**: Sequential scans in EXPLAIN ANALYZE
**Solution**: Add B-tree or GIN index on filtered columns

### Pattern 2: N+1 Queries
**Symptom**: Multiple round-trips for related data
**Solution**: Use JOINs or batch queries with connection pooling

### Pattern 3: RLS Policy Overhead
**Symptom**: Index not used due to RLS filtering
**Solution**: Rewrite RLS policy to enable index usage, add projects join

### Pattern 4: JSONB Performance
**Symptom**: Slow queries on JSONB fields
**Solution**: Add GIN index with specific JSONB path operators

### Pattern 5: Connection Pool Saturation
**Symptom**: Connection timeout errors
**Solution**: Optimize long-running queries, tune pool configuration

## Monitoring After Optimization

### Key Metrics to Track
1. **Query Performance**
   - Average query execution time
   - P95/P99 latency
   - Slow query log entries

2. **Connection Pool**
   - Active connections
   - Pool utilization %
   - Connection wait time

3. **Index Usage**
   - Index hit rate
   - Index scans vs sequential scans
   - Index size growth

4. **RLS Performance**
   - RLS policy execution time
   - Failed RLS checks
   - Permission query overhead

### Tools
- Supabase Dashboard → Query Performance
- PostgreSQL pg_stat_statements
- Connection pool metrics in app logs
- Performance monitoring: `apps/web/src/lib/performance/monitoring.ts`

## Troubleshooting

### Agent Provides Generic Advice
**Fix**: Provide more specific context:
- Exact file paths
- Current query code
- Performance metrics
- Error logs

### Migration Conflicts with RLS
**Fix**: Request RLS-aware optimization:
```typescript
prompt: "Optimize query while maintaining RLS compliance for organization isolation"
```

### Optimization Doesn't Improve Performance
**Fix**: Request validation:
```typescript
prompt: "Run EXPLAIN ANALYZE before/after optimization to validate improvement"
```

## Related Resources

### Documentation
- [Migration Guide](../packages/database/MIGRATION_GUIDE.md)
- [Performance Optimizations](./PERFORMANCE_OPTIMIZATIONS.md)
- [Security Audit](./SECURITY_AUDIT_REPORT.md)

### Database Files
- Migrations: `packages/database/migrations/*.sql`
- Types: `packages/database/src/types.ts`
- Connection Pool: `apps/web/src/lib/supabase/connection-pool.ts`

### Debugging Reports
- [ITP Export RLS Fix](./debugging-reports/itp-export-rls-fix.md)
- [Export Endpoint Debug](./export-endpoint-debug-report.md)

## Support

For database optimization questions or issues with the agent:
1. Check existing debugging reports in `docs/debugging-reports/`
2. Review migration history in `packages/database/migrations/`
3. Consult Supabase Dashboard query performance
4. Create issue with agent output and context

---

**Last Updated**: 2025-10-09
**Agent Version**: 1.0.0
**SiteProof Version**: v2.0
