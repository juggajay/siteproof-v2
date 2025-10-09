-- Materialized View Auto-Refresh System
-- Migration: 0026
-- Created: 2025-10-09
-- Purpose: Automatically refresh project_dashboard_stats when underlying data changes

-- ============================================================================
-- Create function to refresh materialized view
-- ============================================================================

-- Drop existing function if it exists (handles different return types)
DROP FUNCTION IF EXISTS refresh_project_dashboard_stats() CASCADE;

CREATE OR REPLACE FUNCTION refresh_project_dashboard_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh the materialized view in the background
  -- Using CONCURRENTLY to avoid locking the view during refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_dashboard_stats;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create triggers on all tables that affect project stats
-- ============================================================================

-- Trigger on projects table
DROP TRIGGER IF EXISTS trigger_refresh_project_stats_on_projects ON projects;
CREATE TRIGGER trigger_refresh_project_stats_on_projects
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_project_dashboard_stats();

-- Trigger on lots table
DROP TRIGGER IF EXISTS trigger_refresh_project_stats_on_lots ON lots;
CREATE TRIGGER trigger_refresh_project_stats_on_lots
  AFTER INSERT OR UPDATE OR DELETE ON lots
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_project_dashboard_stats();

-- Trigger on comments table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') THEN
    DROP TRIGGER IF EXISTS trigger_refresh_project_stats_on_comments ON comments;
    CREATE TRIGGER trigger_refresh_project_stats_on_comments
      AFTER INSERT OR UPDATE OR DELETE ON comments
      FOR EACH STATEMENT
      EXECUTE FUNCTION refresh_project_dashboard_stats();
  END IF;
END $$;

-- ============================================================================
-- Alternative: Scheduled refresh using pg_cron (if available)
-- ============================================================================

-- Check if pg_cron extension is available
DO $$
BEGIN
  -- Try to create extension (will fail silently if not available)
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- If pg_cron is available, schedule refresh every 5 minutes
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if it exists
    PERFORM cron.unschedule('refresh-project-dashboard-stats');

    -- Schedule new job to refresh every 5 minutes
    PERFORM cron.schedule(
      'refresh-project-dashboard-stats',
      '*/5 * * * *', -- Every 5 minutes
      'REFRESH MATERIALIZED VIEW CONCURRENTLY project_dashboard_stats;'
    );

    RAISE NOTICE '✅ Scheduled automatic refresh every 5 minutes using pg_cron';
  ELSE
    RAISE NOTICE '⚠️  pg_cron not available. Using triggers for refresh.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Could not set up pg_cron. Using triggers for refresh.';
END $$;

-- ============================================================================
-- Create unique index on materialized view (required for CONCURRENTLY)
-- ============================================================================

-- This is critical for REFRESH MATERIALIZED VIEW CONCURRENTLY to work
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_dashboard_stats_unique_project
  ON project_dashboard_stats(project_id);

-- ============================================================================
-- Manual refresh function for API use
-- ============================================================================

-- Drop existing function if it exists (handles different return types)
DROP FUNCTION IF EXISTS force_refresh_project_stats() CASCADE;

CREATE OR REPLACE FUNCTION force_refresh_project_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_dashboard_stats;
  RAISE NOTICE 'Project dashboard stats refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION force_refresh_project_stats() TO authenticated;

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Materialized view auto-refresh system installed!';
  RAISE NOTICE '📊 View will refresh automatically on data changes';
  RAISE NOTICE '🔄 You can also manually refresh with: SELECT force_refresh_project_stats();';
END $$;
