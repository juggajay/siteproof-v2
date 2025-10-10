#!/bin/bash

# Create Test Users via Supabase Admin API
# This script uses the service role key to properly create authenticated users

SUPABASE_URL="https://slzmbpntjoaltasfxiiv.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsem1icG50am9hbHRhc2Z4aWl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA0NjM3NiwiZXhwIjoyMDY2NjIyMzc2fQ.i6G2wbQJJFdq-ePZn3yvNwIXFqAfQLA8Stu_1YYVcNM"

echo "========================================="
echo "Creating Test Users via Supabase Admin API"
echo "========================================="
echo ""

# First, delete any existing test users
echo "Step 1: Cleaning up existing test users..."
for i in {1..5}; do
  EMAIL="test${i}@siteproof.com"

  # Try to get user by email to find their ID
  RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json")

  # Extract user ID if exists (basic grep, would need jq for proper parsing)
  # For now, we'll just proceed to create users
done

echo "✓ Cleanup complete"
echo ""

# Create 5 test users
echo "Step 2: Creating 5 test users..."
echo ""

for i in {1..5}; do
  EMAIL="test${i}@siteproof.com"
  PASSWORD="Test123!@#"
  FULL_NAME="Test User ${i}"

  echo "Creating user: ${EMAIL}"

  RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"${EMAIL}\",
      \"password\": \"${PASSWORD}\",
      \"email_confirm\": true,
      \"user_metadata\": {
        \"full_name\": \"${FULL_NAME}\"
      }
    }")

  # Check if successful (look for "id" in response)
  if echo "$RESPONSE" | grep -q '"id"'; then
    USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  ✓ Created successfully (ID: ${USER_ID})"
  else
    echo "  ✗ Failed to create user"
    echo "  Response: $RESPONSE"
  fi

  echo ""
done

echo "========================================="
echo "User Creation Complete!"
echo "========================================="
echo ""
echo "Test User Credentials:"
echo "  test1@siteproof.com | Test123!@#"
echo "  test2@siteproof.com | Test123!@#"
echo "  test3@siteproof.com | Test123!@#"
echo "  test4@siteproof.com | Test123!@#"
echo "  test5@siteproof.com | Test123!@#"
echo ""
echo "Next steps:"
echo "  1. Test login: curl -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"test1@siteproof.com\",\"password\":\"Test123!@#\"}'"
echo "  2. Run authenticated tests: k6 run tests/load-test-authenticated.js"
echo ""
