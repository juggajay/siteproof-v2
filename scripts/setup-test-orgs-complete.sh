#!/bin/bash

# Complete Test Organizations Setup via Supabase Admin API
# This script creates test organizations AND links test users as members

SUPABASE_URL="https://slzmbpntjoaltasfxiiv.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsem1icG50am9hbHRhc2Z4aWl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA0NjM3NiwiZXhwIjoyMDY2NjIyMzc2fQ.i6G2wbQJJFdq-ePZn3yvNwIXFqAfQLA8Stu_1YYVcNM"

echo "========================================="
echo "Complete Test Organizations Setup"
echo "========================================="
echo ""

# Step 1: Get all test user IDs
echo "Step 1: Getting test user IDs..."
USERS_JSON=$(curl -s -X GET "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

# Extract test user IDs (those with test emails)
echo "$USERS_JSON" > /tmp/users.json

# Get the first test user ID to use as created_by
FIRST_USER_ID=$(echo "$USERS_JSON" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$FIRST_USER_ID" ]; then
  echo "  ✗ No users found! Please create test users first:"
  echo "    ./scripts/create-test-users-admin-api.sh"
  exit 1
fi

echo "  ✓ Found test users (using first user ID: ${FIRST_USER_ID:0:8}...)"
echo ""

# Step 2: Create organizations (using first user as creator to satisfy created_by constraint)
echo "Step 2: Creating test organizations..."
echo ""

for i in 1 2 3; do
  ORG_ID="00000000-0000-0000-0000-00000000000${i}"
  ORG_NAME="Test Organization ${i}"
  ORG_SLUG="test-org-${i}"

  echo "Creating ${ORG_NAME}..."

  RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/organizations" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{\"id\":\"${ORG_ID}\",\"name\":\"${ORG_NAME}\",\"slug\":\"${ORG_SLUG}\",\"created_by\":\"${FIRST_USER_ID}\"}")

  if echo "$RESPONSE" | grep -q "${ORG_ID}"; then
    echo "  ✓ Created successfully"
  elif echo "$RESPONSE" | grep -q "duplicate key"; then
    echo "  ℹ Already exists (updating...)"
    # Try to update if exists
    curl -s -X PATCH "${SUPABASE_URL}/rest/v1/organizations?id=eq.${ORG_ID}" \
      -H "apikey: ${SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "{\"name\":\"${ORG_NAME}\",\"slug\":\"${ORG_SLUG}\"}" > /dev/null
    echo "  ✓ Updated"
  else
    echo "  ⚠ Warning: $RESPONSE"
  fi

  echo ""
done

# Step 3: Link all test users to all test organizations
echo "Step 3: Creating organization memberships..."
echo ""

# Get all test user IDs properly
TEST_USER_IDS=$(echo "$USERS_JSON" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

for ORG_NUM in 1 2 3; do
  ORG_ID="00000000-0000-0000-0000-00000000000${ORG_NUM}"

  echo "Adding members to Test Organization ${ORG_NUM}..."

  USER_COUNT=0
  for USER_ID in $TEST_USER_IDS; do
    # Add user as admin to this organization
    RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/organization_members" \
      -H "apikey: ${SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: resolution=merge-duplicates,return=representation" \
      -d "{\"organization_id\":\"${ORG_ID}\",\"user_id\":\"${USER_ID}\",\"role\":\"admin\"}")

    if echo "$RESPONSE" | grep -q "${USER_ID}"; then
      USER_COUNT=$((USER_COUNT + 1))
    elif echo "$RESPONSE" | grep -q "duplicate key"; then
      USER_COUNT=$((USER_COUNT + 1))
    fi
  done

  echo "  ✓ Added ${USER_COUNT} members"
  echo ""
done

# Step 4: Verify setup
echo "Step 4: Verifying setup..."
echo ""

for i in 1 2 3; do
  ORG_ID="00000000-0000-0000-0000-00000000000${i}"

  MEMBERS=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/organization_members?organization_id=eq.${ORG_ID}&select=user_id" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

  MEMBER_COUNT=$(echo "$MEMBERS" | grep -o '"user_id"' | wc -l)

  echo "Test Organization ${i}: ${MEMBER_COUNT} members"
done

echo ""
echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "Created test organizations:"
echo "  - 00000000-0000-0000-0000-000000000001 | Test Organization 1"
echo "  - 00000000-0000-0000-0000-000000000002 | Test Organization 2"
echo "  - 00000000-0000-0000-0000-000000000003 | Test Organization 3"
echo ""
echo "All test users have admin access to all organizations."
echo ""
echo "Next steps:"
echo "  1. Start dev server: pnpm dev"
echo "  2. Run tests: k6 run tests/load-test-authenticated.js"
echo ""
