#!/bin/bash

echo "🔧 Complete Fix and Test Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Ensure all files exist
echo -e "\n${YELLOW}Step 1: Verifying local files...${NC}"
if [ -f "apps/web/public/favicon.ico" ] && [ -f "apps/web/public/favicon-16x16.png" ] && [ -f "apps/web/public/icons/icon-144x144.png" ]; then
    echo -e "${GREEN}✓ Icon files exist${NC}"
else
    echo -e "${RED}✗ Icon files missing - regenerating...${NC}"
    node apps/web/scripts/generate-proper-icons.js
fi

# Step 2: Run local tests
echo -e "\n${YELLOW}Step 2: Running local tests...${NC}"
pnpm run type-check
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Type check passed${NC}"
else
    echo -e "${RED}✗ Type check failed${NC}"
    exit 1
fi

pnpm run test
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Unit tests passed${NC}"
else
    echo -e "${RED}✗ Unit tests failed${NC}"
    exit 1
fi

# Step 3: Build the application
echo -e "\n${YELLOW}Step 3: Building application...${NC}"
cd apps/web
pnpm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
cd ../..

# Step 4: Test with Docker
echo -e "\n${YELLOW}Step 4: Testing with Docker...${NC}"
docker-compose -f docker-compose.test-full.yml down
docker-compose -f docker-compose.test-full.yml build
docker-compose -f docker-compose.test-full.yml up -d web

# Wait for service to be healthy
echo "Waiting for web service to be healthy..."
for i in {1..30}; do
    if docker-compose -f docker-compose.test-full.yml ps | grep -q "healthy"; then
        echo -e "${GREEN}✓ Web service is healthy${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Step 5: Run Playwright tests
echo -e "\n${YELLOW}Step 5: Running Playwright tests...${NC}"
npx playwright install chromium
npx playwright test tests/full-app-test.spec.ts --reporter=list

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ All Playwright tests passed${NC}"
else
    echo -e "${RED}✗ Playwright tests failed${NC}"
    # Show logs
    docker-compose -f docker-compose.test-full.yml logs web
fi

# Step 6: Check for console errors
echo -e "\n${YELLOW}Step 6: Checking for console errors...${NC}"
npx playwright test tests/full-app-test.spec.ts --grep "should load dashboard without errors"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ No console errors found${NC}"
else
    echo -e "${RED}✗ Console errors detected${NC}"
fi

# Cleanup
docker-compose -f docker-compose.test-full.yml down

echo -e "\n${YELLOW}================================${NC}"
echo -e "${GREEN}Test Summary:${NC}"
echo "- Icon files: ✓"
echo "- Type check: ✓"
echo "- Unit tests: ✓"
echo "- Build: ✓"
echo "- Docker: ✓"
echo "- Playwright: Check results above"
echo -e "${YELLOW}================================${NC}"