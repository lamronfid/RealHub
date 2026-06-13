-- ═══════════════════════════════════════════════════
-- RealHub — 018 Add Agent Onboarding Details
-- ═══════════════════════════════════════════════════

ALTER TABLE public.agent_profiles 
ADD COLUMN IF NOT EXISTS agency_office TEXT,
ADD COLUMN IF NOT EXISTS most_sold_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS has_developments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS developments_details TEXT;
