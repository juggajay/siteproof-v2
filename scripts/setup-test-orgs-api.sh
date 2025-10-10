#!/bin/bash

# Setup Test Organizations via Supabase REST API
# This uses the service role key to directly insert into the database

SUPABASE_URL="https://slzmbpntjoaltasfxiiv.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsem1icG50am9hbHRhc2Z4aWl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA0NjM3NiwiZXhwIjoyMDY2NjIyMzc2fQ.i6G2wbQJJFdq-ePZn3yvNwIXFqAfQLA8Stu_1YYVcNM"

echo "========================================="
echo "Setting Up Test Organizations"
echo "========================================="
echo ""

# Organization IDs
ORG1="00000000-0000-0000-0000-000000000001"
ORG2="00000000-0000-0000-0000-000000000002"
ORG3="00000000-0000-0000-0000-000000000003"

echo "Step 1: Creating test organizations..."
echo ""

# Create Organization 1
echo "Creating Test Organization 1..."
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/organizations" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "{
    \"id\": \"${ORG1}\",
    \"name\": \"Test Organization 1\",
    \"slug\": \"test-org-1\"
  }")

if echo "$RESPONSE" | grep -q '"id"'; then
  echo "  ✓ Organization 1 created"
else
  echo "  ⚠ Organization 1 may already exist or error occurred"
  echo "  Response: $RESPONSE"
fi

# Create Organization 2
echo "Creating Test Organization 2..."
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/organizations" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "{
    \"id\": \"${ORG2}\",
    \"name\": \"Test Organization 2\",
    \"slug\": \"test-org-2\"
  }")

if echo "$RESPONSE" | grep -q '"id"'; then
  echo "  ✓ Organization 2 created"
else
  echo "  ⚠ Organization 2 may already exist or error occurred"
fi

# Create Organization 3
echo "Creating Test Organization 3..."
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/organizations" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "{
    \"id\": \"${ORG3}\",
    \"name\": \"Test Organization 3\",
    \"slug\": \"test-org-3\"
  }")

if echo "$RESPONSE" | grep -q '"id"'; then
  echo "  ✓ Organization 3 created"
else
  echo "  ⚠ Organization 3 may already exist or error occurred"
fi

echo ""
echo "Step 2: Getting test user IDs..."
echo ""

# Get test users
USERS_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

# Extract user IDs (basic parsing - would be better with jq)
# For now, we'll create a simple approach
echo "Note: You may need to manually link users to organizations if this step fails"
echo ""

echo "Step 3: Linking test users to organizations..."
echo "(This step requires test user IDs - checking if users exist)"
echo ""

# Try to add memberships for each known test user email
for i in {1..5}; do
  EMAIL="test${i}@siteproof.com"

  # Get user ID for this email
  USER_DATA=$(curl -s -X GET "${SUPABASE_URL}/auth/v1/admin/users?email=${EMAIL}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

  # Very basic extraction - would need jq for proper parsing
  if echo "$USER_DATA" | grep -q "$EMAIL"; then
    echo "  Found user: $EMAIL"
    # Note: Adding memberships requires knowing the user ID
    # This part would work better with the SQL approach
  fi
done

echo ""
echo "========================================="
echo "✓ Organizations Setup Complete!"
echo "========================================="
echo ""
echo "Created organizations:"
echo "  - $ORG1 | Test Organization 1"
echo "  - $ORG2 | Test Organization 2"
echo "  - $ORG3 | Test Organization 3"
echo ""
echo "⚠️  IMPORTANT: Organization memberships"
echo "To complete setup, you need to link test users to organizations."
echo ""
echo "Choose one of these methods:"
echo "  1. Use SQL script: psql \$DATABASE_URL -f scripts/create-test-organizations.sql"
echo "  2. Use Supabase Dashboard SQL Editor"
echo "  3. Use Node.js script: node scripts/setup-test-orgs-node.js"
echo ""
