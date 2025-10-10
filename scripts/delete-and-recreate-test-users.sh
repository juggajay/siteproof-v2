#!/bin/bash

# Delete and Recreate Test Users via Supabase Admin API

SUPABASE_URL="https://slzmbpntjoaltasfxiiv.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsem1icG50am9hbHRhc2Z4aWl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA0NjM3NiwiZXhwIjoyMDY2NjIyMzc2fQ.i6G2wbQJJFdq-ePZn3yvNwIXFqAfQLA8Stu_1YYVcNM"

echo "========================================="
echo "Delete and Recreate Test Users"
echo "========================================="
echo ""

# Step 1: Get list of all users and find test users
echo "Step 1: Finding existing test users..."
ALL_USERS=$(curl -s -X GET "${SUPABASE_URL}/auth/v1/admin/users?per_page=1000" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json")

# Extract user IDs for test users (requires jq, but we'll use grep/sed as fallback)
# Check if jq is available
if command -v jq &> /dev/null; then
  echo "  Using jq for JSON parsing..."
  TEST_USER_IDS=$(echo "$ALL_USERS" | jq -r '.users[] | select(.email | test("test[1-5]@siteproof.com")) | .id')
else
  echo "  Using grep/sed for JSON parsing (install jq for better results)..."
  # Fallback to grep/sed (less reliable but works for simple cases)
  TEST_USER_IDS=$(echo "$ALL_USERS" | grep -o '"id":"[^"]*","email":"test[1-5]@siteproof.com"' | cut -d'"' -f4)
fi

if [ -z "$TEST_USER_IDS" ]; then
  echo "  No existing test users found"
else
  echo "  Found test users, deleting..."

  # Step 2: Delete each test user
  while IFS= read -r USER_ID; do
    if [ ! -z "$USER_ID" ]; then
      echo "    Deleting user ID: ${USER_ID}"
      DELETE_RESPONSE=$(curl -s -X DELETE "${SUPABASE_URL}/auth/v1/admin/users/${USER_ID}" \
        -H "apikey: ${SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

      if [ -z "$DELETE_RESPONSE" ] || echo "$DELETE_RESPONSE" | grep -q "success"; then
        echo "      ✓ Deleted"
      else
        echo "      Response: $DELETE_RESPONSE"
      fi
    fi
  done <<< "$TEST_USER_IDS"
fi

echo ""
echo "Step 2: Creating 5 new test users..."
echo ""

# Step 3: Create users with Admin API
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

  # Check if successful
  if echo "$RESPONSE" | grep -q '"id"'; then
    if command -v jq &> /dev/null; then
      USER_ID=$(echo "$RESPONSE" | jq -r '.id')
    else
      USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    fi
    echo "  ✓ Created successfully (ID: ${USER_ID})"
  else
    echo "  ✗ Failed to create user"
    echo "  Response: $RESPONSE"
  fi

  echo ""

  # Small delay to avoid rate limiting
  sleep 0.5
done

echo "========================================="
echo "✓ User Creation Complete!"
echo "========================================="
echo ""
echo "Test User Credentials:"
echo "  test1@siteproof.com | Test123!@#"
echo "  test2@siteproof.com | Test123!@#"
echo "  test3@siteproof.com | Test123!@#"
echo "  test4@siteproof.com | Test123!@#"
echo "  test5@siteproof.com | Test123!@#"
echo ""
echo "Testing login for test1@siteproof.com..."
echo ""

# Test login
sleep 2
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@siteproof.com","password":"Test123!@#"}')

if echo "$LOGIN_RESPONSE" | grep -q '"user"'; then
  echo "✓ Login test SUCCESSFUL!"
  echo "$LOGIN_RESPONSE"
else
  echo "✗ Login test FAILED"
  echo "$LOGIN_RESPONSE"
fi

echo ""
echo "Next steps:"
echo "  1. Run authenticated tests: k6 run tests/load-test-authenticated.js"
echo "  2. Run database write tests: k6 run tests/load-test-database-writes.js"
echo ""
