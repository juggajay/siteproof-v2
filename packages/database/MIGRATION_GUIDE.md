# Database Migration Guide - Foreman-First Flow

## Step 1: Run Migrations in Supabase

Open your Supabase dashboard and go to **SQL Editor**.

### Migration 1: Contractors Schema

Copy and paste the entire contents of `migrations/0021_contractors_schema.sql` and click **RUN**.

This creates:
- `contractors` table (labor and plant contractors)
- `workers` table (workers under labor contractors with hourly rates)
- `plant_items` table (equipment under plant contractors with hourly rates)
- `material_suppliers` table
- `materials` table (preloadable materials catalog)
- All necessary indexes and RLS policies

### Migration 2: Extend Daily Diary

Copy and paste the entire contents of `migrations/0022_extend_daily_diary.sql` and click **RUN**.

This creates:
- Adds `foreman_id` column to `projects` table
- Adds `hide_costs_from_foreman` column to `projects` table
- `diary_labor` table (tracks worker hours per diary entry)
- `diary_plant` table (tracks equipment hours per diary entry)
- `diary_materials` table (tracks materials used, supports ad-hoc entries)
- All necessary indexes and RLS policies

## Step 2: Verify Tables Were Created

Run this query in Supabase SQL Editor:

```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'contractors',
  'workers',
  'plant_items',
  'material_suppliers',
  'materials',
  'diary_labor',
  'diary_plant',
  'diary_materials'
)
ORDER BY table_name;
```

You should see all 8 tables listed.

## Step 3: Test with Sample Data (Optional)

```sql
-- Get your organization ID (replace with your actual organization ID)
-- SELECT id FROM organizations LIMIT 1;

-- Insert a test labor contractor
INSERT INTO contractors (organization_id, name, type, contact_email, is_active)
VALUES
  ('YOUR_ORG_ID', 'ABC Labor Contractors', 'labor', 'contact@abc-labor.com', true)
RETURNING *;

-- Insert a test worker (use the contractor ID from above)
INSERT INTO workers (contractor_id, organization_id, name, job_title, hourly_rate, is_active)
VALUES
  ('CONTRACTOR_ID_FROM_ABOVE', 'YOUR_ORG_ID', 'John Smith', 'Machine Driver', 45.00, true)
RETURNING *;

-- Verify the data
SELECT
  w.name as worker_name,
  w.job_title,
  w.hourly_rate,
  c.name as contractor_name
FROM workers w
JOIN contractors c ON c.id = w.contractor_id
WHERE w.organization_id = 'YOUR_ORG_ID';
```

## Troubleshooting

### If you get "function update_updated_at_column does not exist"

Run this first:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### If you get "relation already exists"

The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to re-run. However, if you need to start fresh:

```sql
-- WARNING: This will delete all data in these tables
DROP TABLE IF EXISTS diary_materials CASCADE;
DROP TABLE IF EXISTS diary_plant CASCADE;
DROP TABLE IF EXISTS diary_labor CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS material_suppliers CASCADE;
DROP TABLE IF EXISTS plant_items CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS contractors CASCADE;

-- Remove columns from projects if needed
ALTER TABLE projects DROP COLUMN IF EXISTS foreman_id;
ALTER TABLE projects DROP COLUMN IF EXISTS hide_costs_from_foreman;
```

Then re-run both migration files.

## Next Steps

After migrations are successful:
1. The TypeScript types have been updated in `packages/database/src/types.ts`
2. Backend APIs will be created next
3. Frontend UI components will consume these APIs
