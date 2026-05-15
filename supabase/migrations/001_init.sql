-- ═══════════════════════════════════════════════════
-- RealHub — Full Database Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- ─── AGENT PROFILES ───
CREATE TABLE IF NOT EXISTS public.agent_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  avatar_url TEXT,
  agency_name TEXT,
  license_number TEXT,
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  coverage_areas TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view all profiles" ON public.agent_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Agents can update own profile" ON public.agent_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Agents can insert own profile" ON public.agent_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ─── PROPERTIES ───
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  transaction_type TEXT NOT NULL,
  property_type TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  department TEXT,
  city TEXT,
  neighborhood TEXT,
  bedrooms INT,
  bathrooms INT,
  garages INT,
  m2_terrain NUMERIC,
  m2_built NUMERIC,
  amenities TEXT[] DEFAULT '{}',
  furnished TEXT,
  exclusive BOOLEAN DEFAULT false,
  photos TEXT[] DEFAULT '{}',
  visibility TEXT DEFAULT 'private',
  marketplace_shared_at TIMESTAMPTZ,
  status TEXT DEFAULT 'activa',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see own + marketplace properties" ON public.properties
  FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR visibility = 'marketplace');
CREATE POLICY "Agents insert own properties" ON public.properties
  FOR INSERT TO authenticated WITH CHECK (agent_id = auth.uid());
CREATE POLICY "Agents update own properties" ON public.properties
  FOR UPDATE TO authenticated USING (agent_id = auth.uid());
CREATE POLICY "Agents delete own properties" ON public.properties
  FOR DELETE TO authenticated USING (agent_id = auth.uid());

-- ─── PROSPECTS ───
CREATE TABLE IF NOT EXISTS public.prospects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES auth.users(id) NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  transaction_type TEXT NOT NULL,
  price_min NUMERIC,
  price_max NUMERIC,
  currency TEXT DEFAULT 'USD',
  departments TEXT[] DEFAULT '{}',
  cities TEXT[] DEFAULT '{}',
  neighborhoods TEXT[] DEFAULT '{}',
  property_types TEXT[] DEFAULT '{}',
  size_min NUMERIC,
  size_max NUMERIC,
  rooms_min INT,
  rooms_max INT,
  bathrooms_min INT,
  bathrooms_max INT,
  amenities TEXT[] DEFAULT '{}',
  garages_min INT,
  furnished_preference TEXT,
  notes TEXT,
  stage TEXT DEFAULT 'nuevo_contacto',
  stage_updated_at TIMESTAMPTZ DEFAULT now(),
  visibility TEXT DEFAULT 'private',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see own + marketplace prospects" ON public.prospects
  FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR visibility = 'marketplace');
CREATE POLICY "Agents insert own prospects" ON public.prospects
  FOR INSERT TO authenticated WITH CHECK (agent_id = auth.uid());
CREATE POLICY "Agents update own prospects" ON public.prospects
  FOR UPDATE TO authenticated USING (agent_id = auth.uid());
CREATE POLICY "Agents delete own prospects" ON public.prospects
  FOR DELETE TO authenticated USING (agent_id = auth.uid());

-- ─── PIPELINE EVENTS (audit trail) ───
CREATE TABLE IF NOT EXISTS public.pipeline_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  agent_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pipeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see own pipeline events" ON public.pipeline_events
  FOR SELECT TO authenticated USING (agent_id = auth.uid());
CREATE POLICY "Agents insert pipeline events" ON public.pipeline_events
  FOR INSERT TO authenticated WITH CHECK (agent_id = auth.uid());

-- ─── FOLLOW-UP REMINDERS ───
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  interval_label TEXT,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own follow-ups" ON public.follow_ups
  FOR ALL TO authenticated USING (agent_id = auth.uid());

-- ─── MARKETPLACE INTERESTS ───
CREATE TABLE IF NOT EXISTS public.marketplace_interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_agent_id UUID REFERENCES auth.users(id),
  to_agent_id UUID REFERENCES auth.users(id),
  property_id UUID REFERENCES public.properties(id),
  prospect_id UUID REFERENCES public.prospects(id),
  message TEXT,
  commission_split NUMERIC,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.marketplace_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see own interests" ON public.marketplace_interests
  FOR SELECT TO authenticated
  USING (from_agent_id = auth.uid() OR to_agent_id = auth.uid());
CREATE POLICY "Agents create interests" ON public.marketplace_interests
  FOR INSERT TO authenticated WITH CHECK (from_agent_id = auth.uid());
CREATE POLICY "Agents update received interests" ON public.marketplace_interests
  FOR UPDATE TO authenticated USING (to_agent_id = auth.uid());

-- ─── NOTIFICATIONS ───
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- ─── EVENTS (schedule) ───
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  prospect_id UUID REFERENCES public.prospects(id),
  property_id UUID REFERENCES public.properties(id),
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own events" ON public.events
  FOR ALL TO authenticated USING (agent_id = auth.uid());

-- ═══════════════════════════════════════════════════
-- AUTO-MATCHING FUNCTION
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION match_properties_for_prospect(p_prospect_id UUID)
RETURNS TABLE(property_id UUID, property_title TEXT, agent_name TEXT, match_score INT) AS $$
  SELECT
    p.id,
    p.title,
    ap.full_name,
    (
      CASE WHEN p.transaction_type = pr.transaction_type THEN 30 ELSE 0 END +
      CASE WHEN p.price BETWEEN COALESCE(pr.price_min, 0) AND COALESCE(pr.price_max, 999999999) THEN 25 ELSE 0 END +
      CASE WHEN p.city = ANY(pr.cities) OR p.department = ANY(pr.departments) THEN 20 ELSE 0 END +
      CASE WHEN p.property_type = ANY(pr.property_types) THEN 15 ELSE 0 END +
      CASE WHEN p.bedrooms BETWEEN COALESCE(pr.rooms_min, 0) AND COALESCE(pr.rooms_max, 99) THEN 10 ELSE 0 END
    ) as match_score
  FROM public.properties p
  JOIN public.prospects pr ON pr.id = p_prospect_id
  LEFT JOIN public.agent_profiles ap ON ap.id = p.agent_id
  WHERE p.visibility = 'marketplace'
    AND p.agent_id != pr.agent_id
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;

-- ═══════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_properties_agent ON public.properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_visibility ON public.properties(visibility);
CREATE INDEX IF NOT EXISTS idx_prospects_agent ON public.prospects(agent_id);
CREATE INDEX IF NOT EXISTS idx_prospects_stage ON public.prospects(stage);
CREATE INDEX IF NOT EXISTS idx_follow_ups_agent_status ON public.follow_ups(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_events_agent ON public.events(agent_id, start_at);
