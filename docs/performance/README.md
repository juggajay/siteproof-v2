# SiteProof v2 Performance Engineering

Complete guide to autonomous performance monitoring and optimization for SiteProof v2.

## Overview

SiteProof v2 uses an autonomous performance engineering system that:

- ✅ **Monitors continuously** via Lighthouse CI and GitHub Actions
- ✅ **Auto-triggers** performance analysis on regressions
- ✅ **Tracks metrics** for Next.js, Supabase, and mobile performance
- ✅ **Optimizes proactively** for construction field workers
- ✅ **Prevents regressions** before code merges

## Quick Start

### 1. Establish Performance Baseline

```bash
# Run the baseline collection script
./scripts/performance/baseline.sh

# This creates a baseline in .performance-baselines/latest.json
```

### 2. Add Performance Scripts to package.json

```json
{
  "scripts": {
    "performance:baseline": "./scripts/performance/baseline.sh",
    "performance:analyze": "pnpm build && pnpm lighthouse:ci",
    "lighthouse:ci": "lhci autorun",
    "lighthouse:local": "lighthouse http://localhost:3000 --view",
    "bundle:analyze": "ANALYZE=true pnpm build"
  }
}
```

### 3. Enable Performance Monitoring

The performance engineer agent is **autonomous** and will activate on:

1. **Pull Requests** - Lighthouse CI runs automatically
2. **Lighthouse Score Drop** - >5% regression triggers analysis
3. **Bundle Size Increase** - >50KB triggers review
4. **Build Time Regression** - >20% increase triggers optimization
5. **Weekly Audits** - Every Monday comprehensive review

## Performance Targets

### Core Web Vitals

- **LCP** (Largest Contentful Paint): <2.5s
- **FID** (First Input Delay): <100ms
- **CLS** (Cumulative Layout Shift): <0.1
- **INP** (Interaction to Next Paint): <200ms

### Application Metrics

- **Lighthouse Performance**: ≥80
- **Build Time**: <60s
- **Time to Interactive**: <3s on 4G
- **Offline Capable**: Yes (inspections work offline)

### Database Performance

- **Average Query Time**: <100ms
- **P95 Query Time**: <500ms
- **RLS Overhead**: <50ms

### Bundle Budgets

- **JavaScript**: <300KB
- **Images**: <500KB
- **Total**: <1MB

## Architecture-Specific Optimizations

### Next.js 14 App Router

#### Server vs Client Components

```typescript
// ✅ GOOD: Server component for data fetching
export default async function InspectionList() {
  const inspections = await db.inspections.findMany()
  return <InspectionGrid inspections={inspections} />
}

// ❌ BAD: Client component with useEffect
'use client'
export default function InspectionList() {
  const [data, setData] = useState([])
  useEffect(() => { fetchData().then(setData) }, [])
  return <InspectionGrid inspections={data} />
}
```

#### Route Configuration

```typescript
// app/inspections/[id]/page.tsx
export const dynamic = 'force-dynamic'; // For real-time data
export const revalidate = 3600; // Cache for 1 hour
export const fetchCache = 'default-cache';
```

### Supabase Optimization

#### Query Performance

```sql
-- ✅ GOOD: Optimized with indexes
SELECT * FROM inspections
WHERE organization_id = $1
  AND created_at > $2
ORDER BY created_at DESC
LIMIT 50;

-- Required index
CREATE INDEX idx_inspections_org_date
ON inspections(organization_id, created_at DESC);
```

#### RLS Policy Optimization

```sql
-- ✅ GOOD: Fast security-definer function
CREATE FUNCTION user_org_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT organization_id FROM users WHERE id = auth.uid() $$;

CREATE POLICY "org_access" ON inspections
FOR SELECT USING (organization_id = user_org_id());

-- ❌ BAD: Subquery in policy (slow)
CREATE POLICY "org_access" ON inspections
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  )
);
```

### Offline-First Mobile

#### Service Worker Caching

```typescript
// Cache inspection forms for offline access
const CACHE_NAME = 'siteproof-v1';
const OFFLINE_URLS = ['/inspections/new', '/inspections/[id]/edit', '/daily-diary/new'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)));
});
```

#### Image Compression

```typescript
// Compress before upload (target: 85% quality, max 1920px)
async function compressImage(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(Math.min(img.width, 1920), Math.min(img.height, 1920));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.convertToBlob({
    type: 'image/webp',
    quality: 0.85,
  });
}
```

## Autonomous Monitoring

### Automatic Triggers

The performance engineer agent **automatically activates** when:

#### 1. Lighthouse Score Regression

```yaml
# .github/workflows/performance-monitor.yml triggers on:
if: lighthouse_score < 0.80
```

#### 2. Bundle Size Alert

```bash
# Pre-commit hook checks:
if [ $SIZE_INCREASE_PCT -gt 10 ]; then
  echo "⚠️ Bundle size increased by ${SIZE_INCREASE_PCT}%"
fi
```

#### 3. Slow Query Detection

```sql
-- Monitors pg_stat_statements for queries >500ms
SELECT query, mean_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 500
ORDER BY mean_exec_time DESC;
```

#### 4. Core Web Vitals Breach

- LCP > 2.5s
- FID > 100ms
- CLS > 0.1
- Triggers immediate analysis

### GitHub Actions Integration

Performance monitoring runs on:

1. **Every Pull Request**
   - Lighthouse CI
   - Bundle size check
   - Build performance

2. **Main Branch Push**
   - Full performance audit
   - Update baselines

3. **Weekly Schedule** (Monday 9 AM)
   - Comprehensive audit
   - Dependency analysis
   - Create GitHub issue with results

4. **Manual Trigger**
   - On-demand full audit
   - Workflow dispatch available

## Using the Performance Engineer

### Manual Invocation

```bash
# Spawn the performance engineer agent
npx claude-flow agent-spawn \
  --type performance-engineer-siteproof \
  --task "Analyze current performance and suggest optimizations"

# With specific context
npx claude-flow agent-spawn \
  --type performance-engineer-siteproof \
  --context "PR #123 showing LCP regression" \
  --task "Investigate and fix LCP regression in inspection list"
```

### Common Tasks

#### Task 1: Optimize Slow Page

```bash
npx claude-flow agent-spawn \
  --type performance-engineer-siteproof \
  --task "Optimize /inspections/[id] page - current LCP is 4.2s, target <2.5s"
```

#### Task 2: Reduce Bundle Size

```bash
npx claude-flow agent-spawn \
  --type performance-engineer-siteproof \
  --task "Reduce JavaScript bundle size - current 450KB, target <300KB"
```

#### Task 3: Database Query Optimization

```bash
npx claude-flow agent-spawn \
  --type performance-engineer-siteproof \
  --task "Optimize slow Supabase queries - queries averaging 800ms"
```

#### Task 4: Mobile Performance

```bash
npx claude-flow agent-spawn \
  --type performance-engineer-siteproof \
  --task "Improve mobile performance on 3G - current TTI is 8s, target <3s"
```

## Performance Tools

### Baseline Collection

```bash
# Collect comprehensive baseline
./scripts/performance/baseline.sh

# Output: .performance-baselines/baseline_TIMESTAMP.json
```

### Lighthouse CI

```bash
# Local Lighthouse audit
pnpm lighthouse:local

# CI Lighthouse (requires server running)
pnpm lighthouse:ci
```

### Bundle Analysis

```bash
# Analyze bundle with webpack-bundle-analyzer
pnpm bundle:analyze

# Opens interactive bundle visualization
```

### Database Analysis

```bash
# Connect to Supabase and analyze queries
psql $SUPABASE_DB_URL -c "
  SELECT query, calls, mean_exec_time, max_exec_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 100
  ORDER BY mean_exec_time DESC
  LIMIT 20;
"
```

## Performance Checklist

### Before Every PR

- [ ] Run `pnpm build` - Check build time
- [ ] Run `pnpm lighthouse:ci` - Verify scores
- [ ] Check bundle size increase <10%
- [ ] Test on mobile device (or Chrome DevTools)
- [ ] Verify Core Web Vitals in green

### Before Production Deploy

- [ ] Full performance baseline collected
- [ ] All Lighthouse budgets passing
- [ ] No slow queries (>500ms)
- [ ] Offline functionality working
- [ ] Mobile performance tested on 3G/4G

### Monthly Review

- [ ] Review performance trends
- [ ] Update performance budgets
- [ ] Audit dependencies for bloat
- [ ] Check for unused code
- [ ] Review and optimize images

## Troubleshooting

### High LCP (>2.5s)

1. Check server response time
2. Optimize images (compression, WebP)
3. Preload critical resources
4. Use Server Components for data fetching
5. Implement streaming SSR

### High TBT (>300ms)

1. Code split large bundles
2. Defer non-critical JavaScript
3. Optimize third-party scripts
4. Use Web Workers for heavy computation
5. Minimize main thread work

### Bundle Size Too Large

1. Analyze with `pnpm bundle:analyze`
2. Remove unused dependencies
3. Use dynamic imports
4. Optimize tree shaking
5. Replace large libraries

### Slow Supabase Queries

1. Check `pg_stat_statements` for slow queries
2. Add missing indexes
3. Optimize RLS policies
4. Use materialized views
5. Implement caching

## Resources

- [Agent Configuration](../agents/performance-engineer-siteproof.md)
- [Baseline Script](../../scripts/performance/baseline.sh)
- [GitHub Workflow](../../.github/workflows/performance-monitor.yml)
- [Lighthouse Configuration](../../.lighthouserc.json)

## Support

For performance issues or questions:

1. Check the [Performance Dashboard](https://vercel.com/siteproof/analytics)
2. Review [Lighthouse CI reports](https://github.com/siteproof/siteproof-v2/actions)
3. Manually trigger performance engineer agent
4. Create GitHub issue with `performance` label

---

**Remember**: The performance engineer agent is **autonomous** and will proactively monitor and optimize your application. Trust the system, but verify results!
