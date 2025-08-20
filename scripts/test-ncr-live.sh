#!/bin/bash

# Test NCR creation on live site
echo "🧪 Testing NCR Creation on Production"
echo "======================================"
echo ""

# Check if the API is responding
echo "1. Testing API health..."
curl -s https://siteproof-v2-web.vercel.app/api/health | jq '.' || echo "Health check failed"

echo ""
echo "2. Testing NCR GET endpoint (should return 401 without auth)..."
response=$(curl -s -w "\n%{http_code}" https://siteproof-v2-web.vercel.app/api/ncrs)
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$status_code" = "401" ]; then
  echo "✅ GET /api/ncrs returned 401 (expected without auth)"
else
  echo "❌ GET /api/ncrs returned $status_code"
  echo "Response: $body"
fi

echo ""
echo "3. To test NCR creation with auth:"
echo "   a) Open browser DevTools on the site"
echo "   b) Go to Application > Cookies"
echo "   c) Find 'sb-slzmbpntjoaltasfxiiv-auth-token'"
echo "   d) Copy the value"
echo "   e) Run: AUTH_TOKEN='your-token' node scripts/test-ncr-api.js"

echo ""
echo "4. Check browser console for errors:"
echo "   - Open DevTools Console"
echo "   - Try creating an NCR"
echo "   - Look for 'Skipping empty' messages"
echo "   - Check Network tab for actual request payload"