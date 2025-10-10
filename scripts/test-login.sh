#!/bin/bash

# Test login with properly formatted JSON

SUPABASE_URL="https://slzmbpntjoaltasfxiiv.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsem1icG50am9hbHRhc2Z4aWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDYzNzYsImV4cCI6MjA2NjYyMjM3Nn0.5zedTH8_OkBMBG8fuC54bbqkwzwjU_NupvFK4Pg28eY"

echo "Testing Supabase Auth login..."
echo ""

# Create JSON file to avoid escaping issues
cat > /tmp/login-payload.json <<'EOF'
{
  "email": "test1@siteproof.com",
  "password": "Test123!@#"
}
EOF

# Test with Supabase Auth API
echo "1. Testing direct Supabase Auth API..."
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d @/tmp/login-payload.json)

if echo "$RESPONSE" | grep -q '"access_token"'; then
  echo "✓ Supabase Auth login SUCCESSFUL!"
  echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | head -1 | cut -d'"' -f4 | head -c 50
  echo "..."
else
  echo "✗ Supabase Auth login FAILED"
  echo "$RESPONSE"
fi

echo ""
echo "2. Testing local Next.js API (if running)..."
API_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d @/tmp/login-payload.json)

if echo "$API_RESPONSE" | grep -q '"user"'; then
  echo "✓ Next.js API login SUCCESSFUL!"
  echo "$API_RESPONSE"
elif echo "$API_RESPONSE" | grep -q "404"; then
  echo "✗ Next.js API route not found (404)"
else
  echo "✗ Next.js API login FAILED"
  echo "$API_RESPONSE" | head -100
fi

rm /tmp/login-payload.json
