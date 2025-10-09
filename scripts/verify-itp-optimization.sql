-- Verify ITP Optimization Migration
-- Run this in Supabase SQL Editor to confirm indexes were created

-- 1. Check all indexes on itp_instances table
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size,
  indexdef
FROM pg_indexes
WHERE tablename = 'itp_instances'
  AND schemaname = 'public'
ORDER BY indexname;

-- 2. Check indexes on itp_templates table
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size,
  indexdef
FROM pg_indexes
WHERE tablename = 'itp_templates'
  AND schemaname = 'public'
ORDER BY indexname;

-- 3. Verify new indexes exist
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_itp_instances_lot_template_status',
    'idx_itp_templates_id_org',
    'idx_itp_instances_project_lot',
    'idx_itp_instances_created_by_date',
    'idx_itp_instances_active'
  )
ORDER BY indexname;

-- 4. Check table statistics were updated
SELECT
  schemaname,
  tablename,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename IN ('itp_instances', 'itp_templates', 'projects')
ORDER BY tablename;
