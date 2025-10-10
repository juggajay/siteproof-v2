#!/bin/bash

# SiteProof v2 Load Testing Script
# Usage: ./run-load-test.sh [BASE_URL] [OUTPUT_DIR]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-http://localhost:3000}"
OUTPUT_DIR="${2:-./tests/load-test-results}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULT_FILE="${OUTPUT_DIR}/load-test-${TIMESTAMP}.json"
REPORT_FILE="${OUTPUT_DIR}/load-test-${TIMESTAMP}.html"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SiteProof v2 Load Testing Suite     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ Error: k6 is not installed${NC}"
    echo -e "${YELLOW}Please install k6 first:${NC}"
    echo "  - Linux: https://k6.io/docs/getting-started/installation/"
    echo "  - Or use: ~/bin/k6 if installed locally"
    exit 1
fi

# Check if server is running
echo -e "${YELLOW}🔍 Checking if server is reachable...${NC}"
if ! curl -s -f -o /dev/null --max-time 5 "${BASE_URL}/api/health"; then
    echo -e "${RED}❌ Error: Server at ${BASE_URL} is not reachable${NC}"
    echo -e "${YELLOW}Please start the server first:${NC}"
    echo "  npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Server is reachable${NC}"
echo ""

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Display test configuration
echo -e "${BLUE}📋 Test Configuration:${NC}"
echo -e "  Target URL: ${GREEN}${BASE_URL}${NC}"
echo -e "  Output Directory: ${GREEN}${OUTPUT_DIR}${NC}"
echo -e "  Result File: ${GREEN}${RESULT_FILE}${NC}"
echo ""

# Run the load test
echo -e "${YELLOW}🚀 Starting load test...${NC}"
echo -e "${YELLOW}This will take approximately 6 minutes${NC}"
echo ""

# Run k6 with JSON output
if ~/bin/k6 run \
    --out json="${RESULT_FILE}" \
    --summary-export="${OUTPUT_DIR}/summary-${TIMESTAMP}.json" \
    -e BASE_URL="${BASE_URL}" \
    tests/load-test.js; then

    echo ""
    echo -e "${GREEN}✅ Load test completed successfully!${NC}"
    echo ""

    # Display summary
    echo -e "${BLUE}📊 Test Results Summary:${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Parse summary file if it exists
    if [ -f "${OUTPUT_DIR}/summary-${TIMESTAMP}.json" ]; then
        echo -e "${YELLOW}Results saved to:${NC}"
        echo -e "  📄 JSON: ${RESULT_FILE}"
        echo -e "  📊 Summary: ${OUTPUT_DIR}/summary-${TIMESTAMP}.json"
    fi

    echo ""
    echo -e "${BLUE}💡 Next Steps:${NC}"
    echo "  1. Review the summary above"
    echo "  2. Check detailed results in: ${OUTPUT_DIR}"
    echo "  3. Analyze metrics to identify bottlenecks"
    echo ""

else
    echo ""
    echo -e "${RED}❌ Load test failed or was interrupted${NC}"
    echo -e "${YELLOW}Check the output above for errors${NC}"
    exit 1
fi

# Display final message
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Load Test Completed Successfully   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
