-- ═══════════════════════════════════════════════════
-- RealHub — 019 Add Scraper Reset Cron Job
-- ═══════════════════════════════════════════════════

-- Enable the pg_cron extension if not already present
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule a cron job to reset monthly scraper usage for all agents
-- This job runs on the 1st of every month at 00:00 (UTC)
SELECT cron.schedule(
  'reset-monthly-scraper-usage',
  '0 0 1 * *',
  $$ UPDATE public.agent_profiles SET scraper_searches_used = 0 WHERE scraper_searches_used > 0 $$
);
