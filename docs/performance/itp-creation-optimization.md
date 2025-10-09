# ITP Creation Performance Optimization

## Current Performance Analysis

### Identified Bottlenecks

#### 1. **Sequential Database Queries** (CRITICAL)

Location: `/apps/web/src/app/api/itp/instances/assign/route.ts`

**Issues:**

- Lines 55-70: Lot verification query (sequential)
- Lines 81-86: Membership verification query (sequential)
- Lines 99-105: Template validation query (sequential)
- Lines 118-122: Existing instances check (sequential)
- Lines 148-158: **RPC call inside FOR loop** - MAJOR BOTTLENECK
- Lines 205-208: Batch insert (sequential after all RPC calls)

**Current Flow:**

```
1. Check authentication → Wait
2. Validate lot → Wait
3. Check membership → Wait
4. Validate templates → Wait
5. Check existing instances → Wait
6. FOR EACH template:
   - Call RPC to initialize data → Wait
   - Build instance object
7. Insert all instances → Wait
```

**Total Estimated Time:** 500-800ms+ (depending on number of templates)

#### 2. **RPC Overhead**

- Line 153-158: Calling `initialize_inspection_data` RPC function for EACH template
- RPC calls have network overhead + function execution time
- For 3 templates: 3 separate RPC calls = ~150-300ms overhead

#### 3. **Missing Database Indexes**

- No index on `itp_instances(lot_id, template_id)` - duplicate check is slow
- No index on `lots(project_id, id)` - lot lookup is slow
- No index on `itp_templates(organization_id, is_active, deleted_at)` - template query is slow

#### 4. **No Optimistic UI Updates**

Location: `/apps/web/src/features/lots/components/AssignITPModal.tsx`

- Frontend waits for full server response before updating UI
- User sees "Assigning..." spinner for entire duration
- No immediate feedback

### Optimization Strategy

#### Phase 1: Parallel Database Queries (Target: -200ms)

```typescript
// BEFORE: Sequential (500ms total)
const lot = await queryLot(); // 100ms
const member = await queryMember(); // 100ms
const templates = await queryTemplates(); // 150ms
const existing = await queryExisting(); // 150ms

// AFTER: Parallel (150ms total - longest query)
const [lot, member, templates, existing] = await Promise.all([
  queryLot(),
  queryMember(),
  queryTemplates(),
  queryExisting(),
]);
```

#### Phase 2: Eliminate RPC Calls (Target: -150ms)

- Move data initialization logic to TypeScript
- Remove RPC call overhead
- Initialize data directly in application code

#### Phase 3: Add Database Indexes (Target: -100ms)

```sql
-- Composite index for duplicate checks
CREATE INDEX idx_itp_instances_lot_template ON itp_instances(lot_id, template_id);

-- Composite index for lot queries
CREATE INDEX idx_lots_project_id ON lots(project_id, id);

-- Composite index for template queries
CREATE INDEX idx_itp_templates_org_active ON itp_templates(organization_id, is_active, deleted_at);
```

#### Phase 4: Optimistic UI Updates (Target: Perceived instant)

- Update UI immediately when user clicks "Assign"
- Show success state before server confirms
- Handle errors with rollback if needed

### Performance Targets

| Metric              | Current      | Target           | Improvement      |
| ------------------- | ------------ | ---------------- | ---------------- |
| API Response Time   | 500-800ms    | <150ms           | 75-80% faster    |
| User Perceived Time | 500-800ms    | <50ms            | 90%+ faster      |
| Database Queries    | 5 sequential | 1 parallel batch | 80% reduction    |
| RPC Calls           | N templates  | 0                | 100% elimination |

### Implementation Priority

1. **HIGH**: Parallelize database queries (biggest impact, easy change)
2. **HIGH**: Remove RPC calls (significant overhead reduction)
3. **MEDIUM**: Add database indexes (infrastructure improvement)
4. **MEDIUM**: Optimistic UI updates (UX improvement)

### Testing Plan

1. Add performance timing logs
2. Test with 1, 3, 5, 10 templates
3. Measure before/after for each optimization
4. Verify data integrity maintained
5. Test error handling and rollback scenarios

## Next Steps

1. Implement parallel queries in assign endpoint
2. Move initialization logic from RPC to TypeScript
3. Create and apply database migration for indexes
4. Add optimistic updates to AssignITPModal
5. Add performance monitoring and logging
