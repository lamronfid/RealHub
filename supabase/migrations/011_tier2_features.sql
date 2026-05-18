-- ═══════════════════════════════════════════════════
-- RealHub — Phase 2 Tier 2: Onboarding, Feedback, Analytics, Map
-- ═══════════════════════════════════════════════════

-- 1. Onboarding flag
ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS experience_years INTEGER,
  ADD COLUMN IF NOT EXISTS specialty TEXT;

-- 2. Feature requests table
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can insert their own requests"
  ON feature_requests FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can read their own requests"
  ON feature_requests FOR SELECT
  USING (auth.uid() = agent_id);

-- 3. Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  page TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can insert events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

-- 4. Map coordinates on properties
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
