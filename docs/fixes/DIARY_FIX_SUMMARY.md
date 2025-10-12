# Daily Diary Data Persistence Fix - Complete Summary

## Problem

The daily diary system was not saving all entered data. When viewing a saved diary, critical information was missing:

- Worker names (only showing trades)
- Company names
- Hours worked
- Work performed descriptions
- Equipment and material details

## Root Cause

1. **Database schema mismatch**: The `diary_labour_entries`, `diary_plant_entries`, and `diary_material_entries` tables were missing fields that the frontend was sending
2. **API mapping issues**: The API routes weren't properly mapping all fields when saving/retrieving data
3. **Frontend display issues**: The diary detail page wasn't displaying all available fields

## Fixes Applied

### 1. Database Migration

Created migration file: `apps/web/supabase/migrations/fix_diary_labour_entries.sql`

```sql
-- Add missing fields to diary_labour_entries table
ALTER TABLE diary_labour_entries
ADD COLUMN IF NOT EXISTS worker_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company VARCHAR(255),
ADD COLUMN IF NOT EXISTS workers INTEGER DEFAULT 1;

-- Add missing fields to diary_plant_entries table
ALTER TABLE diary_plant_entries
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS type VARCHAR(100),
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS hours_used DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing fields to diary_material_entries table
ALTER TABLE diary_material_entries
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS quantity DECIMAL(10, 3),
ADD COLUMN IF NOT EXISTS unit VARCHAR(50),
ADD COLUMN IF NOT EXISTS supplier VARCHAR(255),
ADD COLUMN IF NOT EXISTS notes TEXT;
```

### 2. API Updates

#### `/api/diaries/route.ts` (POST - Create diary)

- Updated to map all fields properly when inserting labour, plant, and material entries
- Ensures worker_name, company, hours, and work_performed are saved

#### `/api/diaries/[id]/route.ts` (GET & PUT)

- GET: Retrieves all entry data including new fields
- PUT: Updates entries with complete field mapping

### 3. Frontend Updates

#### `DiaryForm/LabourSection.tsx`

- Added `company` field to LabourEntry interface
- Updated `addLabourEntry` function to capture company name
- Ensures all fields are sent to API

#### `dashboard/diaries/[id]/page.tsx`

- Updated display logic to show all fields with fallbacks
- Shows worker_name, company, total_hours, work_performed
- Added proper field mapping for plant and material entries

### 4. Testing Infrastructure

Created comprehensive testing suite:

- **Playwright E2E tests** (`tests/diary-persistence.spec.ts`)
- **Docker test environment** (`docker-compose.test.yml`, `Dockerfile.test`)
- **Test scripts** (`test-diary.sh`, `test-diary-api.js`)
- **Manual verification script** (`verify-diary-fix.js`)

## How to Apply the Fix

### Step 1: Apply Database Migration

Connect to your Supabase database and run:

```bash
psql -h your-host -U postgres -d your-database < apps/web/supabase/migrations/fix_diary_labour_entries.sql
```

Or via Supabase Dashboard:

1. Go to SQL Editor
2. Paste the migration SQL
3. Run the query

### Step 2: Deploy Code Changes

The following files have been updated and need to be deployed:

- `apps/web/src/app/api/diaries/route.ts`
- `apps/web/src/app/api/diaries/[id]/route.ts`
- `apps/web/src/app/dashboard/diaries/[id]/page.tsx`
- `apps/web/src/features/diary/components/DiaryForm/LabourSection.tsx`

### Step 3: Verify the Fix

#### Manual Verification:

1. Login to the application
2. Navigate to `/dashboard/diaries/new`
3. Create a new diary with:
   - Fill work summary
   - Add labour entries with names, companies, hours, and work descriptions
   - Add plant and material entries
   - Save the diary
4. View the saved diary
5. Verify ALL fields are displayed:
   - ✅ Worker names (not just trades)
   - ✅ Company names
   - ✅ Hours worked
   - ✅ Work performed descriptions
   - ✅ Plant equipment details
   - ✅ Material quantities and suppliers

#### Automated Testing:

```bash
# Run Playwright tests
cd apps/web
npx playwright test tests/diary-persistence.spec.ts

# Or use Docker
./test-diary.sh test

# Or run API test
node test-diary-api.js
```

## Expected Results

After applying the fix, when viewing a saved diary:

### Before Fix:

- Labour section only showed trade names
- No worker names, companies, or hours visible
- Work performed descriptions missing
- Plant/material details incomplete

### After Fix:

- Complete labour information displayed
- All worker names, companies, hours visible
- Work performed descriptions shown
- Plant equipment with all details
- Materials with quantities and suppliers

## Test Data Example

When testing, use this data to verify all fields persist:

**Labour Entry:**

- Worker Name: John Smith
- Trade: Carpenter
- Company: ABC Construction
- Hours: 8
- Work Performed: Installing formwork for columns B1-B4

This should display exactly as entered when viewing the saved diary.

## Troubleshooting

If data is still not persisting:

1. **Check database migration was applied:**

   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'diary_labour_entries'
   AND column_name IN ('worker_name', 'company');
   ```

2. **Clear browser cache** and reload the application

3. **Check browser console** for any API errors

4. **Verify API response** includes all fields:
   - Open Network tab in browser DevTools
   - Create/view a diary
   - Check the API response contains all expected fields

## Success Criteria

The fix is successful when:

1. ✅ All entered data persists to database
2. ✅ All data displays when viewing saved diary
3. ✅ Export (PDF/Excel) includes all data
4. ✅ Edit functionality preserves all existing data
5. ✅ No console errors or warnings

## Files Modified

- `/apps/web/supabase/migrations/fix_diary_labour_entries.sql` (NEW)
- `/apps/web/src/app/api/diaries/route.ts`
- `/apps/web/src/app/api/diaries/[id]/route.ts`
- `/apps/web/src/app/dashboard/diaries/[id]/page.tsx`
- `/apps/web/src/features/diary/components/DiaryForm/LabourSection.tsx`
- `/apps/web/tests/diary-persistence.spec.ts` (NEW)
- `/apps/web/playwright.config.ts`

## Contact

If issues persist after applying this fix, check:

1. Database migration was successfully applied
2. All code changes were deployed
3. Browser cache was cleared
4. No conflicting migrations or schema changes
