-- ═══════════════════════════════════════════════════
-- RealHub — 020 Add Account Type to Agent Profiles
-- ═══════════════════════════════════════════════════

ALTER TABLE public.agent_profiles 
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'agent';
