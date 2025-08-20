#!/bin/bash

echo "🔍 Direct NCR API Test"
echo "====================="
echo ""

# You need to get these values from your browser
echo "⚠️  You need to provide authentication token and project ID"
echo ""
echo "To get these values:"
echo "1. Open https://siteproof-v2-web.vercel.app in browser"
echo "2. Login to your account"
echo "3. Open DevTools (F12)"
echo "4. Go to Application > Cookies"
echo "5. Find 'sb-slzmbpntjoaltasfxiiv-auth-token.0' and 'sb-slzmbpntjoaltasfxiiv-auth-token.1'"
echo "6. Go to Network tab, find any API call, look at Request Headers for project_id in the URL"
echo ""

# Replace these with actual values
AUTH_TOKEN_0="${AUTH_TOKEN_0:-your-token-0-here}"
AUTH_TOKEN_1="${AUTH_TOKEN_1:-your-token-1-here}"
PROJECT_ID="${PROJECT_ID:-your-project-id-here}"

if [[ "$AUTH_TOKEN_0" == "your-token-0-here" ]]; then
  echo "❌ Please set AUTH_TOKEN_0, AUTH_TOKEN_1, and PROJECT_ID environment variables"
  echo "Example:"
  echo "  AUTH_TOKEN_0='...' AUTH_TOKEN_1='...' PROJECT_ID='...' bash $0"
  exit 1
fi

API_URL="https://siteproof-v2-web.vercel.app/api/ncrs"

echo "Testing NCR creation with minimal data..."
echo ""

# Create form data with minimal required fields
# This simulates what the browser sends
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$API_URL" \
  -H "Cookie: sb-slzmbpntjoaltasfxiiv-auth-token.0=$AUTH_TOKEN_0; sb-slzmbpntjoaltasfxiiv-auth-token.1=$AUTH_TOKEN_1" \
  -F "title=Test NCR from Script" \
  -F "description=This is a test NCR to check if the API is working correctly" \
  -F "severity=medium" \
  -F "category=Quality" \
  -F "project_id=$PROJECT_ID" \
  -F "tags=[\"test\"]" \
  -F "contractor_id=" \
  -F "assigned_to=")

# Extract status code and body
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "Response Status: $HTTP_STATUS"
echo "Response Body:"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

if [[ "$HTTP_STATUS" == "200" ]] || [[ "$HTTP_STATUS" == "201" ]]; then
  echo ""
  echo "✅ NCR created successfully!"
else
  echo ""
  echo "❌ NCR creation failed with status $HTTP_STATUS"
  echo ""
  echo "Common issues:"
  echo "- contractor_id is being sent as empty string (should not be sent at all)"
  echo "- Storage bucket 'ncr-attachments' doesn't exist"
  echo "- Authentication token expired"
fi