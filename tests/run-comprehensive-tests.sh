#!/bin/bash

# Comprehensive Test Suite Runner
# Runs all load tests and E2E tests for SiteProof v2

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
OUTPUT_DIR="tests/comprehensive-test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║    SiteProof v2 Comprehensive Test Suite                ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Check if k6 is installed
if ! command -v k6 &> /dev/null && ! command -v ~/bin/k6 &> /dev/null; then
    echo -e "${RED}❌ Error: k6 is not installed${NC}"
    echo -e "${YELLOW}Please install k6 first or use ~/bin/k6 if installed locally${NC}"
    exit 1
fi

K6_CMD="k6"
if command -v ~/bin/k6 &> /dev/null; then
    K6_CMD="~/bin/k6"
fi

# Check if server is running
echo -e "${YELLOW}🔍 Checking if server is running...${NC}"
if ! curl -s -f -o /dev/null --max-time 5 "${BASE_URL}/api/health"; then
    echo -e "${RED}❌ Error: Server at ${BASE_URL} is not reachable${NC}"
    echo -e "${YELLOW}Please start the server first: pnpm dev${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Server is reachable${NC}"
echo ""

# Test counters
TOTAL_TESTS=3
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}📋 Test Plan:${NC}"
echo -e "  1. ⚡ Basic Load Test (baseline)"
echo -e "  2. 🔐 Authenticated User Flow Test"
echo -e "  3. 💾 Database Write Operations Test"
echo -e "  4. 🎭 E2E Critical User Flows (if Playwright installed)"
echo ""
echo -e "${YELLOW}⏱️  Estimated Duration: ~30 minutes${NC}"
echo ""

read -p "Press ENTER to start tests or Ctrl+C to cancel..."
echo ""

# Test 1: Basic Load Test (Quick)
echo -e "${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}Test 1/4: Basic Load Test${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo ""

if $K6_CMD run \
    --out json="${OUTPUT_DIR}/basic-load-${TIMESTAMP}.json" \
    --summary-export="${OUTPUT_DIR}/basic-load-summary-${TIMESTAMP}.json" \
    -e BASE_URL="${BASE_URL}" \
    tests/load-test.js; then
    echo -e "${GREEN}✅ Basic Load Test: PASSED${NC}"
    ((PASSED_TESTS++))
else
    echo -e "${RED}❌ Basic Load Test: FAILED${NC}"
    ((FAILED_TESTS++))
fi
echo ""

# Test 2: Authenticated User Flow Test
echo -e "${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}Test 2/4: Authenticated User Flow Test${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⚠️  Note: This test requires test users to exist${NC}"
echo -e "${YELLOW}   Create users: test1@siteproof.com through test5@siteproof.com${NC}"
echo -e "${YELLOW}   Password: Test123!@#${NC}"
echo ""

read -p "Press ENTER to continue or skip this test (Ctrl+C)..."

if $K6_CMD run \
    --out json="${OUTPUT_DIR}/auth-flow-${TIMESTAMP}.json" \
    --summary-export="${OUTPUT_DIR}/auth-flow-summary-${TIMESTAMP}.json" \
    -e BASE_URL="${BASE_URL}" \
    tests/load-test-authenticated.js; then
    echo -e "${GREEN}✅ Authenticated User Flow Test: PASSED${NC}"
    ((PASSED_TESTS++))
else
    echo -e "${YELLOW}⚠️  Authenticated User Flow Test: SKIPPED or FAILED${NC}"
    echo -e "${YELLOW}   (Expected if test users don't exist)${NC}"
    ((FAILED_TESTS++))
fi
echo ""

# Test 3: Database Write Operations Test
echo -e "${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}Test 3/4: Database Write Operations Test${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${RED}⚠️  WARNING: This test WRITES to the database!${NC}"
echo -e "${YELLOW}   Make sure you are testing against a dev/test environment${NC}"
echo ""

read -p "Press ENTER to continue or Ctrl+C to skip..."

if $K6_CMD run \
    --out json="${OUTPUT_DIR}/db-writes-${TIMESTAMP}.json" \
    --summary-export="${OUTPUT_DIR}/db-writes-summary-${TIMESTAMP}.json" \
    -e BASE_URL="${BASE_URL}" \
    tests/load-test-database-writes.js; then
    echo -e "${GREEN}✅ Database Write Operations Test: PASSED${NC}"
    ((PASSED_TESTS++))
else
    echo -e "${YELLOW}⚠️  Database Write Operations Test: FAILED${NC}"
    ((FAILED_TESTS++))
fi
echo ""

# Test 4: E2E Tests (if Playwright is installed)
echo -e "${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}Test 4/4: End-to-End Critical User Flows${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo ""

if command -v pnpm &> /dev/null && [ -f "package.json" ]; then
    if pnpm --filter web playwright test tests/e2e/critical-user-flows.spec.ts \
        --reporter=html \
        --reporter=json 2>&1 | tee "${OUTPUT_DIR}/e2e-${TIMESTAMP}.log"; then
        echo -e "${GREEN}✅ E2E Tests: PASSED${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${YELLOW}⚠️  E2E Tests: FAILED or SKIPPED${NC}"
        ((FAILED_TESTS++))
    fi
else
    echo -e "${YELLOW}⚠️  E2E Tests: SKIPPED (Playwright not available)${NC}"
fi
echo ""

# Generate Summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║              Test Suite Complete!                        ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📊 Test Results Summary${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Total Tests:  ${TOTAL_TESTS}"
echo -e "  ${GREEN}Passed:       ${PASSED_TESTS}${NC}"
echo -e "  ${RED}Failed:       ${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✨ All tests passed! Your application is production-ready! ✨${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review the results above.${NC}"
fi

echo ""
echo -e "${BLUE}📁 Results Location:${NC}"
echo -e "  ${OUTPUT_DIR}/"
echo ""

echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "  1. Review detailed results in ${OUTPUT_DIR}/"
echo -e "  2. Check summary JSON files for metrics"
echo -e "  3. Fix any failing tests"
echo -e "  4. Re-run tests to verify fixes"
echo ""

# Exit with error if any tests failed
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
fi

exit 0
