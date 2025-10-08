#!/bin/bash

# Accessibility Testing Script
# Tests accessibility using axe-core and pa11y

set -e

echo "🔍 Running Accessibility Tests..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${YELLOW}⚠️  Server not running. Starting server...${NC}"
    pnpm build
    pnpm start &
    SERVER_PID=$!
    sleep 5
fi

# Install pa11y if not available
if ! command -v pa11y &> /dev/null; then
    echo "📦 Installing pa11y..."
    pnpm add -D pa11y pa11y-ci
fi

# Test pages
PAGES=(
    "http://localhost:3000"
    "http://localhost:3000/dashboard"
    "http://localhost:3000/auth/login"
)

echo ""
echo "Testing ${#PAGES[@]} pages..."
echo ""

TOTAL_ERRORS=0

for page in "${PAGES[@]}"; do
    echo "Testing: $page"

    # Run pa11y
    if pnpm dlx pa11y "$page" --reporter cli; then
        echo -e "${GREEN}✅ Passed${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
        ((TOTAL_ERRORS++))
    fi
    echo ""
done

# Kill server if we started it
if [ ! -z "$SERVER_PID" ]; then
    kill $SERVER_PID
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Accessibility Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $TOTAL_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $TOTAL_ERRORS page(s) failed${NC}"
    exit 1
fi
