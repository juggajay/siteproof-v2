#!/bin/bash

# SiteProof v2 Performance Baseline Collection Script
# Collects comprehensive performance baselines for monitoring and regression detection

set -e

echo "🚀 SiteProof v2 Performance Baseline Collection"
echo "================================================"
echo ""

# Configuration
BASELINE_DIR="./.performance-baselines"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BASELINE_FILE="$BASELINE_DIR/baseline_$TIMESTAMP.json"

# Create baseline directory if it doesn't exist
mkdir -p "$BASELINE_DIR"

echo "📊 Step 1: Collecting Build Performance Metrics"
echo "------------------------------------------------"

# Build the application and measure time
BUILD_START=$(date +%s)
pnpm build > /dev/null 2>&1
BUILD_END=$(date +%s)
BUILD_TIME=$((BUILD_END - BUILD_START))

echo "✓ Build completed in ${BUILD_TIME}s"

# Get bundle sizes
echo ""
echo "📦 Step 2: Analyzing Bundle Sizes"
echo "------------------------------------------------"

# Extract bundle sizes from Next.js build output
BUNDLE_INFO=$(pnpm build 2>&1 | grep -A 50 "Route (app)" || echo "")

# Parse JavaScript bundle size (simplified)
JS_SIZE=$(du -sb apps/web/.next/static | cut -f1)
TOTAL_SIZE=$(du -sb apps/web/.next | cut -f1)

echo "✓ JavaScript bundle: $(numfmt --to=iec-i --suffix=B $JS_SIZE)"
echo "✓ Total build size: $(numfmt --to=iec-i --suffix=B $TOTAL_SIZE)"

echo ""
echo "🔍 Step 3: Running Lighthouse CI"
echo "------------------------------------------------"

# Run Lighthouse CI
LIGHTHOUSE_RESULTS=$(pnpm --filter web lighthouse:ci --output json 2>&1 || echo "{}")

# Extract key metrics
PERF_SCORE=$(echo "$LIGHTHOUSE_RESULTS" | jq -r '.[] | select(.url | contains("localhost:3000/")) | .categories.performance.score * 100' 2>/dev/null || echo "0")
FCP=$(echo "$LIGHTHOUSE_RESULTS" | jq -r '.[] | select(.url | contains("localhost:3000/")) | .audits."first-contentful-paint".numericValue' 2>/dev/null || echo "0")
LCP=$(echo "$LIGHTHOUSE_RESULTS" | jq -r '.[] | select(.url | contains("localhost:3000/")) | .audits."largest-contentful-paint".numericValue' 2>/dev/null || echo "0")
TBT=$(echo "$LIGHTHOUSE_RESULTS" | jq -r '.[] | select(.url | contains("localhost:3000/")) | .audits."total-blocking-time".numericValue' 2>/dev/null || echo "0")
CLS=$(echo "$LIGHTHOUSE_RESULTS" | jq -r '.[] | select(.url | contains("localhost:3000/")) | .audits."cumulative-layout-shift".numericValue' 2>/dev/null || echo "0")

echo "✓ Performance Score: ${PERF_SCORE}%"
echo "✓ First Contentful Paint: ${FCP}ms"
echo "✓ Largest Contentful Paint: ${LCP}ms"
echo "✓ Total Blocking Time: ${TBT}ms"
echo "✓ Cumulative Layout Shift: ${CLS}"

echo ""
echo "🗄️  Step 4: Analyzing Supabase Query Performance"
echo "------------------------------------------------"

# Note: This requires SUPABASE_DB_URL to be set
if [ -n "$SUPABASE_DB_URL" ]; then
  # Get query statistics (requires pg_stat_statements extension)
  QUERY_STATS=$(psql "$SUPABASE_DB_URL" -t -c "
    SELECT
      COUNT(*) as query_count,
      ROUND(AVG(mean_exec_time)::numeric, 2) as avg_exec_time,
      ROUND(MAX(max_exec_time)::numeric, 2) as max_exec_time
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_stat_statements%'
  " 2>/dev/null || echo "0|0|0")

  QUERY_COUNT=$(echo "$QUERY_STATS" | cut -d'|' -f1 | tr -d ' ')
  AVG_QUERY_TIME=$(echo "$QUERY_STATS" | cut -d'|' -f2 | tr -d ' ')
  MAX_QUERY_TIME=$(echo "$QUERY_STATS" | cut -d'|' -f3 | tr -d ' ')

  echo "✓ Tracked queries: ${QUERY_COUNT}"
  echo "✓ Average query time: ${AVG_QUERY_TIME}ms"
  echo "✓ Max query time: ${MAX_QUERY_TIME}ms"
else
  echo "⚠ SUPABASE_DB_URL not set, skipping database analysis"
  QUERY_COUNT=0
  AVG_QUERY_TIME=0
  MAX_QUERY_TIME=0
fi

echo ""
echo "📱 Step 5: Dependency Analysis"
echo "------------------------------------------------"

# Count dependencies
DEV_DEPS=$(cat package.json | jq '.devDependencies | length')
PROD_DEPS=$(cat package.json | jq '.dependencies | length')
TOTAL_DEPS=$((DEV_DEPS + PROD_DEPS))

echo "✓ Production dependencies: ${PROD_DEPS}"
echo "✓ Development dependencies: ${DEV_DEPS}"
echo "✓ Total dependencies: ${TOTAL_DEPS}"

# Check for outdated packages
OUTDATED_COUNT=$(pnpm outdated --format json 2>/dev/null | jq 'length' || echo "0")
echo "✓ Outdated packages: ${OUTDATED_COUNT}"

echo ""
echo "💾 Step 6: Saving Baseline"
echo "------------------------------------------------"

# Create comprehensive baseline JSON
cat > "$BASELINE_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "version": "$(cat package.json | jq -r '.version')",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
  "build": {
    "time_seconds": $BUILD_TIME,
    "bundle_size_bytes": $TOTAL_SIZE,
    "javascript_size_bytes": $JS_SIZE
  },
  "lighthouse": {
    "performance_score": $PERF_SCORE,
    "first_contentful_paint_ms": $FCP,
    "largest_contentful_paint_ms": $LCP,
    "total_blocking_time_ms": $TBT,
    "cumulative_layout_shift": $CLS
  },
  "database": {
    "query_count": $QUERY_COUNT,
    "avg_query_time_ms": $AVG_QUERY_TIME,
    "max_query_time_ms": $MAX_QUERY_TIME
  },
  "dependencies": {
    "production": $PROD_DEPS,
    "development": $DEV_DEPS,
    "total": $TOTAL_DEPS,
    "outdated": $OUTDATED_COUNT
  }
}
EOF

echo "✓ Baseline saved to: $BASELINE_FILE"

# Create/update latest baseline symlink
ln -sf "baseline_$TIMESTAMP.json" "$BASELINE_DIR/latest.json"

echo ""
echo "📈 Step 7: Storing in Claude-Flow Memory"
echo "------------------------------------------------"

# Store baseline in claude-flow memory for agent access
npx claude-flow@alpha hooks notify \
  --message "Performance baseline established: Build ${BUILD_TIME}s, Perf ${PERF_SCORE}%, LCP ${LCP}ms" \
  2>/dev/null || echo "⚠ Claude-Flow not available, skipping memory storage"

echo ""
echo "✅ Baseline Collection Complete!"
echo "================================================"
echo ""
echo "Summary:"
echo "  • Build Time: ${BUILD_TIME}s"
echo "  • Performance Score: ${PERF_SCORE}%"
echo "  • LCP: ${LCP}ms"
echo "  • Bundle Size: $(numfmt --to=iec-i --suffix=B $TOTAL_SIZE)"
echo "  • Baseline File: $BASELINE_FILE"
echo ""
echo "Next steps:"
echo "  1. Review baseline metrics in $BASELINE_FILE"
echo "  2. Set performance budgets based on baseline"
echo "  3. Run 'npm run performance:compare' to compare against baseline"
echo ""
