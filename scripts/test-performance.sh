#!/bin/bash

# Performance Testing Script
# Tests performance using Lighthouse CI

set -e

echo "🚀 Running Performance Tests..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build the app
echo "📦 Building application..."
pnpm build

# Start the server
echo "🌐 Starting production server..."
pnpm start &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server..."
sleep 5

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}❌ Server failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Server is ready${NC}"
echo ""

# Run Lighthouse CI
echo "🔍 Running Lighthouse audit..."
echo ""

if pnpm dlx @lhci/cli@latest autorun; then
    echo ""
    echo -e "${GREEN}✅ Performance tests passed!${NC}"
    RESULT=0
else
    echo ""
    echo -e "${RED}❌ Performance tests failed${NC}"
    RESULT=1
fi

# Kill the server
echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Performance Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Targets:"
echo "  - Performance: 90+"
echo "  - Accessibility: 90+"
echo "  - Best Practices: 90+"
echo "  - SEO: 90+"
echo ""
echo "  - FCP: < 2.0s"
echo "  - LCP: < 2.5s"
echo "  - CLS: < 0.1"
echo "  - TBT: < 300ms"
echo ""

exit $RESULT
