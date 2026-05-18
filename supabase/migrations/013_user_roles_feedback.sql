-- ═══════════════════════════════════════════════════
-- RealHub — 013 User Roles, Onboarding & Feedback
-- ═══════════════════════════════════════════════════

-- 1. Add fields to agent_profiles
ALTER TABLE public.agent_profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agent',
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS experience_years INTEGER;

-- 2. Create feature_requests table
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for feature_requests
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feature requests
CREATE POLICY "Users can create their own feature requests" 
ON public.feature_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all feature requests (assuming we check role in a view or function later, or simple service_role for now)
-- Let's make it so only the owner can read their own, OR admin can read all (but we enforce admin via backend for simplicity)
CREATE POLICY "Users can view their own feature requests" 
ON public.feature_requests FOR SELECT 
USING (auth.uid() = user_id);

-- 3. We also want an Admin policy if needed, but typically admin requests use the service_role key.
