-- ═══════════════════════════════════════════════════
-- RealHub Migration: Add Email to Agent Profiles
-- ═══════════════════════════════════════════════════

-- 1. Add email column
ALTER TABLE public.agent_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Backfill email values from auth.users
UPDATE public.agent_profiles ap
SET email = u.email
FROM auth.users u
WHERE ap.id = u.id;
