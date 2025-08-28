#!/bin/bash

# Verify Deployment Script
# This script checks if all assets are properly deployed to Vercel

echo "🔍 Verifying deployment..."
echo "================================"

BASE_URL="https://siteproof-v2-web.vercel.app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check favicon files
echo -e "\n${YELLOW}Checking favicon files...${NC}"
FAVICON_FILES=(
    "/favicon.ico"
    "/favicon-16x16.png"
    "/favicon-32x32.png"
    "/apple-touch-icon.png"
)

for file in "${FAVICON_FILES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${file}")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✓${NC} ${file} - Status: ${STATUS}"
    else
        echo -e "${RED}✗${NC} ${file} - Status: ${STATUS}"
    fi
done

# Check PWA icons
echo -e "\n${YELLOW}Checking PWA icons...${NC}"
ICON_SIZES=(72 96 128 144 152 192 384 512)

for size in "${ICON_SIZES[@]}"; do
    FILE="/icons/icon-${size}x${size}.png"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${FILE}")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✓${NC} ${FILE} - Status: ${STATUS}"
    else
        echo -e "${RED}✗${NC} ${FILE} - Status: ${STATUS}"
    fi
done

# Check manifest.json
echo -e "\n${YELLOW}Checking manifest.json...${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/manifest.json")
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✓${NC} manifest.json - Status: ${STATUS}"
else
    echo -e "${RED}✗${NC} manifest.json - Status: ${STATUS}"
fi

# Check service worker
echo -e "\n${YELLOW}Checking service worker...${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/sw.js")
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✓${NC} sw.js - Status: ${STATUS}"
else
    echo -e "${RED}✗${NC} sw.js - Status: ${STATUS}"
fi

# Check API health
echo -e "\n${YELLOW}Checking API health...${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health")
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✓${NC} API health check - Status: ${STATUS}"
else
    echo -e "${RED}✗${NC} API health check - Status: ${STATUS}"
fi

echo -e "\n${YELLOW}================================${NC}"
echo -e "${GREEN}Deployment verification complete!${NC}"
echo -e "${YELLOW}================================${NC}"

# Summary
echo -e "\n📝 Summary:"
echo "If any files show status other than 200, wait for Vercel to rebuild"
echo "or check the deployment logs at https://vercel.com"