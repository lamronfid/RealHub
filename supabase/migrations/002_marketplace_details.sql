-- ═══════════════════════════════════════════════════
-- RealHub — Marketplace Details Update
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS trees_count INT,
ADD COLUMN IF NOT EXISTS m2_balcony NUMERIC,
ADD COLUMN IF NOT EXISTS construction_year INT;
