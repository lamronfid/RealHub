-- ═══════════════════════════════════════════════════
-- RealHub — 016 Add Scraper Tracking
-- ═══════════════════════════════════════════════════

-- Alter agent_profiles to add scraper tracking usage count
ALTER TABLE public.agent_profiles 
ADD COLUMN IF NOT EXISTS scraper_searches_used INTEGER DEFAULT 0;
