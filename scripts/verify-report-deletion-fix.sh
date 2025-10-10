#!/bin/bash

# Script to verify report deletion fix is properly deployed
# Run this after applying migration 0031 and clearing browser cache

set -e

echo "============================================"
echo "Report Deletion Fix Verification"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: API code version
echo "1. Checking API code version..."
if grep -q "CODE VERSION: 2025-10-11-v2" apps/web/src/app/api/reports/\[id\]/route.ts; then
    echo -e "${GREEN}✓${NC} API code has correct version marker"
else
    echo -e "${RED}✗${NC} API code missing version marker"
fi

# Check 2: Cache-Control headers
echo ""
echo "2. Checking Cache-Control headers..."
if grep -q "Cache-Control.*no-store" apps/web/src/app/api/reports/\[id\]/route.ts; then
    echo -e "${GREEN}✓${NC} Cache-Control headers present"
else
    echo -e "${RED}✗${NC} Cache-Control headers missing"
fi

# Check 3: 404 error response
echo ""
echo "3. Checking 404 error response..."
if grep -q "status: 404" apps/web/src/app/api/reports/\[id\]/route.ts; then
    echo -e "${GREEN}✓${NC} 404 error response implemented"
else
    echo -e "${RED}✗${NC} 404 error response missing"
fi

# Check 4: Migration file exists
echo ""
echo "4. Checking migration 0031 exists..."
if [ -f "packages/database/migrations/0031_final_fix_report_delete_permissions.sql" ]; then
    echo -e "${GREEN}✓${NC} Migration 0031 file exists"
    echo "   Location: packages/database/migrations/0031_final_fix_report_delete_permissions.sql"
else
    echo -e "${RED}✗${NC} Migration 0031 file not found"
fi

# Check 5: Server is running
echo ""
echo "5. Checking if Next.js server is running..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Server is running on port 3000"
else
    echo -e "${RED}✗${NC} Server is not responding"
fi

# Check 6: Old success message removed
echo ""
echo "6. Checking old success message is removed..."
if grep -q "Report deleted successfully (or already deleted)" apps/web/src/app/api/reports/\[id\]/route.ts; then
    echo -e "${RED}✗${NC} Old success message still in code!"
else
    echo -e "${GREEN}✓${NC} Old success message removed from code"
fi

echo ""
echo "============================================"
echo "Next Steps"
echo "============================================"
echo ""
echo -e "${YELLOW}MANUAL STEPS REQUIRED:${NC}"
echo ""
echo "1. Apply Database Migration:"
echo "   - Open Supabase Dashboard SQL Editor"
echo "   - Copy contents of: packages/database/migrations/0031_final_fix_report_delete_permissions.sql"
echo "   - Execute the SQL"
echo "   - Verify: One DELETE policy named 'report_queue_delete_allow_org_members'"
echo ""
echo "2. Clear Browser Cache:"
echo "   - Open DevTools (F12)"
echo "   - Go to Network tab"
echo "   - Check 'Disable cache' checkbox"
echo "   - Right-click refresh -> 'Empty Cache and Hard Reload'"
echo ""
echo "3. Test Report Deletion:"
echo "   - Try to delete a report in the UI"
echo "   - Check Network tab for DELETE request"
echo "   - Look for server log: '[DELETE /api/reports/[id]] Request received - CODE VERSION: 2025-10-11-v2'"
echo "   - Expected: Status 200 with deletedCount: 1 (success)"
echo "   - Or: Status 404/403 with proper error message"
echo ""
echo "4. Verify Database:"
echo "   Run in Supabase SQL Editor:"
echo "   SELECT * FROM debug_report_delete_permission('[report-id]'::uuid);"
echo ""
echo "For detailed troubleshooting, see:"
echo "  docs/REPORT_DELETION_ISSUE_SUMMARY.md"
echo ""
