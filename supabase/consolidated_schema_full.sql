-- ═══════════════════════════════════════════════════
-- RealHub Consolidated Complete Database Schema (001 - 018)
-- Run this single script to set up a fresh database from scratch.
-- ═══════════════════════════════════════════════════

-- ─── START OF MIGRATION: 001_init.sql ───
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

-- ─── END OF MIGRATION: 001_init.sql ───

-- ─── START OF MIGRATION: 001_acm_reports.sql SQL Shared ───
-- ACM Reports table
create table if not exists public.acm_reports (
  id              uuid primary key default gen_random_uuid(),
  agent_id        uuid not null references public.agent_profiles(id) on delete cascade,
  subject_property jsonb not null,
  comparables     jsonb not null default '[]',
  report_data     jsonb not null,
  agent_notes     text,
  pdf_url         text,
  created_at      timestamptz not null default now()
);

-- RLS
alter table public.acm_reports enable row level security;

create policy "Agents can read their own ACMs"
  on public.acm_reports for select
  using (agent_id = auth.uid());

create policy "Agents can insert their own ACMs"
  on public.acm_reports for insert
  with check (agent_id = auth.uid());

create policy "Agents can update their own ACMs"
  on public.acm_reports for update
  using (agent_id = auth.uid());

-- Index for fast agent lookups
create index acm_reports_agent_id_idx on public.acm_reports(agent_id);
create index acm_reports_created_at_idx on public.acm_reports(created_at desc);

-- ─── END OF MIGRATION: 001_acm_reports.sql SQL Shared ───

-- ─── START OF MIGRATION: 002_marketplace_details.sql ───
-- ═══════════════════════════════════════════════════
-- RealHub — Marketplace Details Update
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS trees_count INT,
ADD COLUMN IF NOT EXISTS m2_balcony NUMERIC,
ADD COLUMN IF NOT EXISTS construction_year INT;

-- ─── END OF MIGRATION: 002_marketplace_details.sql ───

-- ─── START OF MIGRATION: 002_property_listings.sql SQL Shared ───
create table if not exists public.property_listings (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,
  title       text not null,
  price       text not null default 'Consultar',
  location    text not null default '',
  url         text not null,
  photo       text,
  bedrooms    int,
  operation   text,
  prop_type   text,
  scraped_at  timestamptz not null default now(),

  constraint property_listings_url_unique unique (url)
);

-- No user-based RLS — internal scraper data, anon key has full access.
alter table public.property_listings disable row level security;

create index property_listings_source_idx    on public.property_listings(source);
create index property_listings_scraped_at_idx on public.property_listings(scraped_at desc);
create index property_listings_operation_idx  on public.property_listings(operation, prop_type);

-- ─── END OF MIGRATION: 002_property_listings.sql SQL Shared ───

-- ─── START OF MIGRATION: 003_agent_properties.sql SQL Shared ───
-- Agent-owned property listings
-- agent_id is TEXT (not FK) for now — will be replaced with auth.uid() FK
-- once RealHub auth is integrated.

create table if not exists public.agent_properties (
  id              uuid primary key default gen_random_uuid(),
  agent_id        text not null,                          -- placeholder: 'current-agent-id'
  title           text not null,
  operation_type  text not null,                          -- 'venta' | 'alquiler'
  property_type   text not null,                          -- 'casa' | 'departamento' | 'duplex' | 'terreno' | 'local_comercial'
  neighborhood    text,
  city            text not null,
  department      text,
  price           numeric not null,
  currency        text not null default 'USD',            -- 'USD' | 'GS'
  sqm_total       numeric,
  sqm_built       numeric,
  bedrooms        int,
  garages         int,
  year_built      int,
  property_condition text,                                -- 'en_pozo' | 'en_construccion' | 'terminado' | 'usado'
  amenities       text[] not null default '{}',
  description     text,
  main_photo      text,
  photos          text[] not null default '{}',
  visibility      text not null default 'private',        -- 'private' | 'marketplace'
  source          text not null default 'manual',         -- 'manual' | 'remax_import' | 'century21_import'
  source_url      text,                                   -- original URL when imported from external site
  source_agent_id text,                                   -- external agent ID (remax profile ID, c21 asesor ID)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS will be enabled once auth is integrated
-- For now: anon key has full access (development only)
alter table public.agent_properties disable row level security;

-- Indexes
create index agent_properties_agent_id_idx      on public.agent_properties(agent_id);
create index agent_properties_operation_idx     on public.agent_properties(operation_type, property_type);
create index agent_properties_city_idx          on public.agent_properties(city, neighborhood);
create index agent_properties_visibility_idx    on public.agent_properties(visibility);
create index agent_properties_created_at_idx    on public.agent_properties(created_at desc);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger agent_properties_updated_at
  before update on public.agent_properties
  for each row execute function public.set_updated_at();

-- ─── END OF MIGRATION: 003_agent_properties.sql SQL Shared ───

-- ─── START OF MIGRATION: 003_match_scoring.sql ───
-- ═══════════════════════════════════════════════════
-- RealHub — Updated Match Scoring Algorithm
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION match_properties_for_prospect(p_prospect_id UUID)
RETURNS TABLE(property_id UUID, property_title TEXT, agent_name TEXT, match_score INT) AS $$
  WITH scores AS (
    SELECT
      p.id as property_id,
      p.title as property_title,
      ap.full_name as agent_name,
      (
        -- 1. Presupuesto (35 pts)
        CASE 
          WHEN pr.price_max IS NULL THEN 35
          WHEN p.price <= pr.price_max THEN 35 
          WHEN p.price <= (pr.price_max * 1.10) THEN 15 
          ELSE 0 
        END +
        
        -- 2. Ubicación (25 pts)
        CASE 
          WHEN array_length(pr.cities, 1) IS NULL THEN 10
          WHEN p.city = ANY(pr.cities) THEN 25 
          ELSE 0 
        END +
        
        -- 3. Dormitorios (20 pts)
        CASE 
          WHEN pr.rooms_min IS NULL THEN 20
          WHEN p.bedrooms >= pr.rooms_min THEN 20 
          WHEN p.bedrooms = (pr.rooms_min - 1) THEN 10 
          ELSE 0 
        END +
        
        -- 4. Metros y Extras (20 pts)
        CASE 
          WHEN pr.size_min IS NULL THEN 10
          WHEN p.m2_built >= pr.size_min THEN 10 
          ELSE 0 
        END +
        CASE 
          WHEN pr.bathrooms_min IS NULL THEN 5
          WHEN p.bathrooms >= pr.bathrooms_min THEN 5 
          ELSE 0 
        END +
        CASE 
          WHEN pr.garages_min IS NULL THEN 5
          WHEN p.garages >= pr.garages_min THEN 5 
          ELSE 0 
        END
      ) as match_score
    FROM public.properties p
    JOIN public.prospects pr ON pr.id = p_prospect_id
    LEFT JOIN public.agent_profiles ap ON ap.id = p.agent_id
    WHERE p.visibility = 'marketplace'
      AND p.transaction_type = pr.transaction_type
      AND p.agent_id != pr.agent_id
  )
  SELECT property_id, property_title, agent_name, match_score
  FROM scores
  WHERE match_score >= 50
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;

-- ─── END OF MIGRATION: 003_match_scoring.sql ───

-- ─── START OF MIGRATION: 004_fix_acm_reports.sql SQL Shared ───
-- Re-create acm_reports without the agent_profiles FK (which does not exist yet).
-- RLS disabled to match agent_properties while auth is not yet integrated.

drop table if exists public.acm_reports;

create table public.acm_reports (
  id               uuid        primary key default gen_random_uuid(),
  agent_id         text        not null,
  subject_property jsonb       not null,
  comparables      jsonb       not null default '[]',
  report_data      jsonb       not null,
  agent_notes      text,
  pdf_url          text,
  created_at       timestamptz not null default now()
);

alter table public.acm_reports disable row level security;

create index acm_reports_agent_id_idx  on public.acm_reports(agent_id);
create index acm_reports_created_at_idx on public.acm_reports(created_at desc);

-- ─── END OF MIGRATION: 004_fix_acm_reports.sql SQL Shared ───

-- ─── START OF MIGRATION: 004_match_prospects.sql ───
-- ═══════════════════════════════════════════════════
-- RealHub — Match Prospects for Property Algorithm
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION match_prospects_for_property(p_property_id UUID)
RETURNS TABLE(prospect_id UUID, prospect_name TEXT, agent_name TEXT, match_score INT) AS $$
  WITH scores AS (
    SELECT
      pr.id as prospect_id,
      pr.full_name as prospect_name,
      ap.full_name as agent_name,
      (
        -- 1. Presupuesto (35 pts)
        CASE 
          WHEN pr.price_max IS NULL THEN 35
          WHEN p.price <= pr.price_max THEN 35 
          WHEN p.price <= (pr.price_max * 1.10) THEN 15 
          ELSE 0 
        END +
        
        -- 2. Ubicación (25 pts)
        CASE 
          WHEN array_length(pr.cities, 1) IS NULL THEN 10
          WHEN p.city = ANY(pr.cities) THEN 25 
          ELSE 0 
        END +
        
        -- 3. Dormitorios (20 pts)
        CASE 
          WHEN pr.rooms_min IS NULL THEN 20
          WHEN p.bedrooms >= pr.rooms_min THEN 20 
          WHEN p.bedrooms = (pr.rooms_min - 1) THEN 10 
          ELSE 0 
        END +
        
        -- 4. Metros y Extras (20 pts)
        CASE 
          WHEN pr.size_min IS NULL THEN 10
          WHEN p.m2_built >= pr.size_min THEN 10 
          ELSE 0 
        END +
        CASE 
          WHEN pr.bathrooms_min IS NULL THEN 5
          WHEN p.bathrooms >= pr.bathrooms_min THEN 5 
          ELSE 0 
        END +
        CASE 
          WHEN pr.garages_min IS NULL THEN 5
          WHEN p.garages >= pr.garages_min THEN 5 
          ELSE 0 
        END
      ) as match_score
    FROM public.prospects pr
    JOIN public.properties p ON p.id = p_property_id
    LEFT JOIN public.agent_profiles ap ON ap.id = pr.agent_id
    WHERE pr.stage NOT IN ('cerrado', 'perdido')
      AND pr.transaction_type = p.transaction_type
      AND pr.agent_id != p.agent_id
  )
  SELECT prospect_id, prospect_name, agent_name, match_score
  FROM scores
  WHERE match_score >= 50
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;

-- ─── END OF MIGRATION: 004_match_prospects.sql ───

-- ─── START OF MIGRATION: 005_notification_triggers.sql ───
-- ═══════════════════════════════════════════════════
-- RealHub — Notification Triggers for Auto-Matching
-- ═══════════════════════════════════════════════════

-- 1. Trigger when a NEW PROPERTY is added
CREATE OR REPLACE FUNCTION notify_on_property_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visibility = 'marketplace' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT
      pr.agent_id,
      'match',
      '¡Nuevo Match Potencial! 🟢',
      'Una nueva propiedad "' || NEW.title || '" hace match (' || m.match_score || '%) con tu prospecto "' || pr.full_name || '".',
      '/prospectos/' || pr.id || '/matches'
    FROM match_prospects_for_property(NEW.id) m
    JOIN public.prospects pr ON pr.id = m.prospect_id
    WHERE m.match_score >= 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_property_insert ON public.properties;
CREATE TRIGGER on_property_insert
AFTER INSERT ON public.properties
FOR EACH ROW EXECUTE FUNCTION notify_on_property_insert();

-- 2. Trigger when a NEW PROSPECT is added
CREATE OR REPLACE FUNCTION notify_on_prospect_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage NOT IN ('cerrado', 'perdido') THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT
      p.agent_id,
      'match',
      '¡Nuevo Prospecto Interesado! 🟢',
      'Un nuevo prospecto hace match (' || m.match_score || '%) con tu propiedad "' || p.title || '".',
      '/propiedades/' || p.id || '/matches'
    FROM match_properties_for_prospect(NEW.id) m
    JOIN public.properties p ON p.id = m.property_id
    WHERE m.match_score >= 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_prospect_insert ON public.prospects;
CREATE TRIGGER on_prospect_insert
AFTER INSERT ON public.prospects
FOR EACH ROW EXECUTE FUNCTION notify_on_prospect_insert();

-- ─── END OF MIGRATION: 005_notification_triggers.sql ───

-- ─── START OF MIGRATION: 005_property_listings_rls.sql SQL Shared ───
-- Enable RLS on property_listings (was disabled — anon key had full access).
-- Scraped data is public-read, but writes must go through the service role
-- (server-side only, never from the browser).

alter table public.property_listings enable row level security;

-- Anyone can read scraped listings (they are public property market data).
create policy "Public read access"
  on public.property_listings for select
  using (true);

-- Only the service role (server-side) can write listings.
-- The anon key used in the browser cannot insert, update, or delete.
-- Note: service_role bypasses RLS by default in Supabase, so no explicit
-- policy is needed for it — this comment is here for documentation only.

-- ─── END OF MIGRATION: 005_property_listings_rls.sql SQL Shared ───

-- ─── START OF MIGRATION: 006_dual_pricing.sql ───
-- ═══════════════════════════════════════════════════
-- RealHub — Migración para Soporte de Precios Duales (Venta y Alquiler simultáneo)
-- ═══════════════════════════════════════════════════

-- 1. Añadir nuevas columnas de precios
ALTER TABLE public.properties
ADD COLUMN sale_price NUMERIC,
ADD COLUMN rent_price NUMERIC;

-- 2. Migrar los datos existentes del campo 'price' a los nuevos campos
UPDATE public.properties
SET sale_price = price
WHERE transaction_type = 'compra';

UPDATE public.properties
SET rent_price = price
WHERE transaction_type = 'alquiler';

-- 3. Eliminar la columna antigua 'price'
ALTER TABLE public.properties
DROP COLUMN price;

-- 4. Re-crear la función de Match para Prospectos usando la nueva lógica de doble precio
CREATE OR REPLACE FUNCTION match_prospects_for_property(p_property_id UUID)
RETURNS TABLE(prospect_id UUID, prospect_name TEXT, agent_name TEXT, match_score INT) AS $$
  WITH scores AS (
    SELECT
      pr.id as prospect_id,
      pr.full_name as prospect_name,
      ap.full_name as agent_name,
      (
        -- 1. Presupuesto (35 pts)
        -- Ahora comparamos contra el precio correspondiente según lo que busque el prospecto
        CASE
          WHEN pr.price_max IS NULL THEN 35
          
          -- Si el prospecto busca COMPRAR
          WHEN pr.transaction_type = 'compra' THEN
            CASE
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= pr.price_max THEN 35
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= (pr.price_max * 1.10) THEN 15
              ELSE 0
            END
            
          -- Si el prospecto busca ALQUILAR
          WHEN pr.transaction_type = 'alquiler' THEN
            CASE
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= pr.price_max THEN 35
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= (pr.price_max * 1.10) THEN 15
              ELSE 0
            END
          ELSE 0
        END +
        
        -- 2. Ubicación (25 pts)
        CASE 
          WHEN array_length(pr.cities, 1) IS NULL THEN 10
          WHEN p.city = ANY(pr.cities) THEN 25 
          ELSE 0 
        END +
        
        -- 3. Dormitorios (20 pts)
        CASE 
          WHEN pr.rooms_min IS NULL THEN 20
          WHEN p.bedrooms >= pr.rooms_min THEN 20 
          WHEN p.bedrooms = (pr.rooms_min - 1) THEN 10 
          ELSE 0 
        END +
        
        -- 4. Metros y Extras (20 pts)
        CASE 
          WHEN pr.size_min IS NULL THEN 10
          WHEN p.m2_built >= pr.size_min THEN 10 
          ELSE 0 
        END +
        CASE 
          WHEN pr.bathrooms_min IS NULL THEN 5
          WHEN p.bathrooms >= pr.bathrooms_min THEN 5 
          ELSE 0 
        END +
        CASE 
          WHEN pr.garages_min IS NULL THEN 5
          WHEN p.garages >= pr.garages_min THEN 5 
          ELSE 0 
        END
      ) as match_score
    FROM public.prospects pr
    JOIN public.properties p ON p.id = p_property_id
    LEFT JOIN public.agent_profiles ap ON ap.id = pr.agent_id
    WHERE pr.stage NOT IN ('cerrado', 'perdido')
      -- Aseguramos que la propiedad esté habilitada para la transacción que busca el prospecto
      AND (
        (pr.transaction_type = 'compra' AND (p.transaction_type = 'compra' OR p.transaction_type = 'ambos'))
        OR
        (pr.transaction_type = 'alquiler' AND (p.transaction_type = 'alquiler' OR p.transaction_type = 'ambos'))
      )
      AND pr.agent_id != p.agent_id
  )
  SELECT prospect_id, prospect_name, agent_name, match_score
  FROM scores
  WHERE match_score >= 50
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;

-- 5. Re-crear la función inversa (Match para Propiedades)
CREATE OR REPLACE FUNCTION match_properties_for_prospect(p_prospect_id UUID)
RETURNS TABLE(property_id UUID, property_title TEXT, agent_name TEXT, match_score INT) AS $$
  WITH prospect_data AS (
    SELECT * FROM public.prospects WHERE id = p_prospect_id
  ),
  scores AS (
    SELECT
      p.id as property_id,
      p.title as property_title,
      ap.full_name as agent_name,
      (
        -- 1. Presupuesto (35 pts)
        CASE 
          WHEN pr.price_max IS NULL THEN 35
          
          WHEN pr.transaction_type = 'compra' THEN
            CASE
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= pr.price_max THEN 35
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= (pr.price_max * 1.10) THEN 15
              ELSE 0
            END
            
          WHEN pr.transaction_type = 'alquiler' THEN
            CASE
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= pr.price_max THEN 35
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= (pr.price_max * 1.10) THEN 15
              ELSE 0
            END
          ELSE 0 
        END +
        
        -- 2. Ubicación (25 pts)
        CASE 
          WHEN array_length(pr.cities, 1) IS NULL THEN 10
          WHEN p.city = ANY(pr.cities) THEN 25 
          ELSE 0 
        END +
        
        -- 3. Dormitorios (20 pts)
        CASE 
          WHEN pr.rooms_min IS NULL THEN 20
          WHEN p.bedrooms >= pr.rooms_min THEN 20 
          WHEN p.bedrooms = (pr.rooms_min - 1) THEN 10 
          ELSE 0 
        END +
        
        -- 4. Metros y Extras (20 pts)
        CASE 
          WHEN pr.size_min IS NULL THEN 10
          WHEN p.m2_built >= pr.size_min THEN 10 
          ELSE 0 
        END +
        CASE 
          WHEN pr.bathrooms_min IS NULL THEN 5
          WHEN p.bathrooms >= pr.bathrooms_min THEN 5 
          ELSE 0 
        END +
        CASE 
          WHEN pr.garages_min IS NULL THEN 5
          WHEN p.garages >= pr.garages_min THEN 5 
          ELSE 0 
        END
      ) as match_score
    FROM public.properties p
    CROSS JOIN prospect_data pr
    LEFT JOIN public.agent_profiles ap ON ap.id = p.agent_id
    WHERE p.visibility = 'marketplace'
      AND (
        (pr.transaction_type = 'compra' AND (p.transaction_type = 'compra' OR p.transaction_type = 'ambos'))
        OR
        (pr.transaction_type = 'alquiler' AND (p.transaction_type = 'alquiler' OR p.transaction_type = 'ambos'))
      )
      AND p.agent_id != pr.agent_id
  )
  SELECT property_id, property_title, agent_name, match_score
  FROM scores
  WHERE match_score >= 50
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;

-- ─── END OF MIGRATION: 006_dual_pricing.sql ───

-- ─── START OF MIGRATION: 007_agenda_visits.sql ───
-- ═══════════════════════════════════════════════════
-- RealHub — Migración para Soporte de Visitas en Agenda
-- ═══════════════════════════════════════════════════

ALTER TABLE public.follow_ups
ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
ADD COLUMN event_type TEXT DEFAULT 'follow_up'; -- 'follow_up', 'visit', 'meeting'

-- ─── END OF MIGRATION: 007_agenda_visits.sql ───

-- ─── START OF MIGRATION: 008_storage_buckets.sql ───
-- ═══════════════════════════════════════════════════
-- RealHub — Migración para crear Storage Bucket de Propiedades
-- ═══════════════════════════════════════════════════

-- 1. Crear el bucket público "properties"
INSERT INTO storage.buckets (id, name, public)
VALUES ('properties', 'properties', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de RLS para los objetos (fotos)
-- Permitir lectura a todo el mundo
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'properties');

-- Permitir subida a usuarios autenticados
CREATE POLICY "Auth Insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'properties' AND auth.role() = 'authenticated');

-- Permitir actualización a usuarios autenticados
CREATE POLICY "Auth Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'properties' AND auth.role() = 'authenticated');

-- Permitir eliminación a usuarios autenticados
CREATE POLICY "Auth Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'properties' AND auth.role() = 'authenticated');

-- ─── END OF MIGRATION: 008_storage_buckets.sql ───

-- ─── START OF MIGRATION: 009_avatars_neighborhood.sql ───
-- ═══════════════════════════════════════════════════
-- RealHub — Avatars Storage Bucket + Neighborhood Matching
-- ═══════════════════════════════════════════════════

-- 1. Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Avatar Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Auth Avatar Insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Auth Avatar Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Auth Avatar Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 2. Update matching functions with neighborhood scoring
-- Prospect → Property matching
CREATE OR REPLACE FUNCTION match_properties_for_prospect(p_prospect_id UUID)
RETURNS TABLE(property_id UUID, property_title TEXT, agent_name TEXT, match_score INT) AS $$
  WITH prospect_data AS (
    SELECT * FROM public.prospects WHERE id = p_prospect_id
  ),
  scores AS (
    SELECT
      p.id as property_id,
      p.title as property_title,
      ap.full_name as agent_name,
      (
        -- 1. Presupuesto (30 pts)
        CASE 
          WHEN pr.price_max IS NULL THEN 30
          WHEN pr.transaction_type = 'compra' THEN
            CASE
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= pr.price_max THEN 30
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= (pr.price_max * 1.10) THEN 15
              ELSE 0
            END
          WHEN pr.transaction_type = 'alquiler' THEN
            CASE
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= pr.price_max THEN 30
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= (pr.price_max * 1.10) THEN 15
              ELSE 0
            END
          ELSE 0 
        END +
        
        -- 2. Ubicación (30 pts: 15 city + 15 neighborhood)
        CASE 
          WHEN array_length(pr.cities, 1) IS NULL AND array_length(pr.neighborhoods, 1) IS NULL THEN 15
          WHEN p.city = ANY(pr.cities) THEN 15 
          ELSE 0 
        END +
        CASE
          WHEN array_length(pr.neighborhoods, 1) IS NULL THEN 5
          WHEN p.neighborhood = ANY(pr.neighborhoods) THEN 15
          ELSE 0
        END +
        
        -- 3. Dormitorios (20 pts)
        CASE 
          WHEN pr.rooms_min IS NULL THEN 20
          WHEN p.bedrooms >= pr.rooms_min THEN 20 
          WHEN p.bedrooms = (pr.rooms_min - 1) THEN 10 
          ELSE 0 
        END +
        
        -- 4. Extras (20 pts: 10 size + 5 bath + 5 garage)
        CASE 
          WHEN pr.size_min IS NULL THEN 10
          WHEN p.m2_built >= pr.size_min THEN 10 
          ELSE 0 
        END +
        CASE 
          WHEN pr.bathrooms_min IS NULL THEN 5
          WHEN p.bathrooms >= pr.bathrooms_min THEN 5 
          ELSE 0 
        END +
        CASE 
          WHEN pr.garages_min IS NULL THEN 5
          WHEN p.garages >= pr.garages_min THEN 5 
          ELSE 0 
        END
      ) as match_score
    FROM public.properties p
    CROSS JOIN prospect_data pr
    LEFT JOIN public.agent_profiles ap ON ap.id = p.agent_id
    WHERE p.visibility = 'marketplace'
      AND (
        (pr.transaction_type = 'compra' AND (p.transaction_type = 'compra' OR p.transaction_type = 'ambos'))
        OR
        (pr.transaction_type = 'alquiler' AND (p.transaction_type = 'alquiler' OR p.transaction_type = 'ambos'))
      )
      AND p.agent_id != pr.agent_id
  )
  SELECT property_id, property_title, agent_name, match_score
  FROM scores
  WHERE match_score >= 50
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;

-- Property → Prospect matching
CREATE OR REPLACE FUNCTION match_prospects_for_property(p_property_id UUID)
RETURNS TABLE(prospect_id UUID, prospect_name TEXT, agent_name TEXT, match_score INT) AS $$
  WITH scores AS (
    SELECT
      pr.id as prospect_id,
      pr.full_name as prospect_name,
      ap.full_name as agent_name,
      (
        -- 1. Presupuesto (30 pts)
        CASE
          WHEN pr.price_max IS NULL THEN 30
          WHEN pr.transaction_type = 'compra' THEN
            CASE
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= pr.price_max THEN 30
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= (pr.price_max * 1.10) THEN 15
              ELSE 0
            END
          WHEN pr.transaction_type = 'alquiler' THEN
            CASE
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= pr.price_max THEN 30
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= (pr.price_max * 1.10) THEN 15
              ELSE 0
            END
          ELSE 0
        END +
        
        -- 2. Ubicación (30 pts: 15 city + 15 neighborhood)
        CASE 
          WHEN array_length(pr.cities, 1) IS NULL AND array_length(pr.neighborhoods, 1) IS NULL THEN 15
          WHEN p.city = ANY(pr.cities) THEN 15 
          ELSE 0 
        END +
        CASE
          WHEN array_length(pr.neighborhoods, 1) IS NULL THEN 5
          WHEN p.neighborhood = ANY(pr.neighborhoods) THEN 15
          ELSE 0
        END +
        
        -- 3. Dormitorios (20 pts)
        CASE 
          WHEN pr.rooms_min IS NULL THEN 20
          WHEN p.bedrooms >= pr.rooms_min THEN 20 
          WHEN p.bedrooms = (pr.rooms_min - 1) THEN 10 
          ELSE 0 
        END +
        
        -- 4. Extras (20 pts)
        CASE 
          WHEN pr.size_min IS NULL THEN 10
          WHEN p.m2_built >= pr.size_min THEN 10 
          ELSE 0 
        END +
        CASE 
          WHEN pr.bathrooms_min IS NULL THEN 5
          WHEN p.bathrooms >= pr.bathrooms_min THEN 5 
          ELSE 0 
        END +
        CASE 
          WHEN pr.garages_min IS NULL THEN 5
          WHEN p.garages >= pr.garages_min THEN 5 
          ELSE 0 
        END
      ) as match_score
    FROM public.prospects pr
    JOIN public.properties p ON p.id = p_property_id
    LEFT JOIN public.agent_profiles ap ON ap.id = pr.agent_id
    WHERE pr.stage NOT IN ('cerrado', 'perdido')
      AND (
        (pr.transaction_type = 'compra' AND (p.transaction_type = 'compra' OR p.transaction_type = 'ambos'))
        OR
        (pr.transaction_type = 'alquiler' AND (p.transaction_type = 'alquiler' OR p.transaction_type = 'ambos'))
      )
      AND pr.agent_id != p.agent_id
  )
  SELECT prospect_id, prospect_name, agent_name, match_score
  FROM scores
  WHERE match_score >= 50
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;

-- ─── END OF MIGRATION: 009_avatars_neighborhood.sql ───

-- ─── START OF MIGRATION: 010_property_details.sql ───
-- ═══════════════════════════════════════════════════
-- RealHub — Phase 2: New Property Detail Columns
-- ═══════════════════════════════════════════════════

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS construction_type TEXT,
  ADD COLUMN IF NOT EXISTS conservation_state TEXT,
  ADD COLUMN IF NOT EXISTS lot_shape TEXT,
  ADD COLUMN IF NOT EXISTS topography TEXT,
  ADD COLUMN IF NOT EXISTS access_type TEXT;

-- ─── END OF MIGRATION: 010_property_details.sql ───

-- ─── START OF MIGRATION: 011_tier2_features.sql ───
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

-- ─── END OF MIGRATION: 011_tier2_features.sql ───

-- ─── START OF MIGRATION: 012_property_type_fields.sql ───
-- ═══════════════════════════════════════════════════
-- RealHub — Phase 2 Tier 3: Property-type specific fields
-- ═══════════════════════════════════════════════════

-- New columns for departamento-specific fields
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS floor_number INTEGER,
  ADD COLUMN IF NOT EXISTS has_elevator BOOLEAN DEFAULT false;

-- New columns for local comercial
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS front_meters DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS floor_location TEXT;

-- Services and zoning (all types)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS services TEXT,
  ADD COLUMN IF NOT EXISTS zoning TEXT;

-- ─── END OF MIGRATION: 012_property_type_fields.sql ───

-- ─── START OF MIGRATION: 013_user_roles_feedback.sql ───
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

-- ─── END OF MIGRATION: 013_user_roles_feedback.sql ───

-- ─── START OF MIGRATION: 014_fix_matching.sql ───
-- Update matching functions to allow matching properties and prospects from the same agent.

-- Prospect → Property matching
CREATE OR REPLACE FUNCTION match_properties_for_prospect(p_prospect_id UUID)
RETURNS TABLE(property_id UUID, property_title TEXT, agent_name TEXT, match_score INT) AS $$
  WITH prospect_data AS (
    SELECT * FROM public.prospects WHERE id = p_prospect_id
  ),
  scores AS (
    SELECT
      p.id as property_id,
      p.title as property_title,
      ap.full_name as agent_name,
      (
        -- 1. Presupuesto (30 pts)
        CASE 
          WHEN pr.price_max IS NULL THEN 30
          WHEN pr.transaction_type = 'compra' THEN
            CASE
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= pr.price_max THEN 30
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= (pr.price_max * 1.10) THEN 15
              ELSE 0
            END
          WHEN pr.transaction_type = 'alquiler' THEN
            CASE
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= pr.price_max THEN 30
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= (pr.price_max * 1.10) THEN 15
              ELSE 0
            END
          ELSE 0 
        END +
        
        -- 2. Ubicación (30 pts: 15 city + 15 neighborhood)
        CASE 
          WHEN array_length(pr.cities, 1) IS NULL AND array_length(pr.neighborhoods, 1) IS NULL THEN 15
          WHEN p.city = ANY(pr.cities) THEN 15 
          ELSE 0 
        END +
        CASE
          WHEN array_length(pr.neighborhoods, 1) IS NULL THEN 5
          WHEN p.neighborhood = ANY(pr.neighborhoods) THEN 15
          ELSE 0
        END +
        
        -- 3. Dormitorios (20 pts)
        CASE 
          WHEN pr.rooms_min IS NULL THEN 20
          WHEN p.bedrooms >= pr.rooms_min THEN 20 
          WHEN p.bedrooms = (pr.rooms_min - 1) THEN 10 
          ELSE 0 
        END +
        
        -- 4. Extras (20 pts: 10 size + 5 bath + 5 garage)
        CASE 
          WHEN pr.size_min IS NULL THEN 10
          WHEN p.m2_built >= pr.size_min THEN 10 
          ELSE 0 
        END +
        CASE 
          WHEN pr.bathrooms_min IS NULL THEN 5
          WHEN p.bathrooms >= pr.bathrooms_min THEN 5 
          ELSE 0 
        END +
        CASE 
          WHEN pr.garages_min IS NULL THEN 5
          WHEN p.garages >= pr.garages_min THEN 5 
          ELSE 0 
        END
      ) as match_score
    FROM public.properties p
    CROSS JOIN prospect_data pr
    LEFT JOIN public.agent_profiles ap ON ap.id = p.agent_id
    WHERE p.visibility = 'marketplace'
      AND (
        (pr.transaction_type = 'compra' AND (p.transaction_type = 'compra' OR p.transaction_type = 'ambos'))
        OR
        (pr.transaction_type = 'alquiler' AND (p.transaction_type = 'alquiler' OR p.transaction_type = 'ambos'))
      )
  )
  SELECT property_id, property_title, agent_name, match_score
  FROM scores
  WHERE match_score >= 50
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;

-- Property → Prospect matching
CREATE OR REPLACE FUNCTION match_prospects_for_property(p_property_id UUID)
RETURNS TABLE(prospect_id UUID, prospect_name TEXT, agent_name TEXT, match_score INT) AS $$
  WITH scores AS (
    SELECT
      pr.id as prospect_id,
      pr.full_name as prospect_name,
      ap.full_name as agent_name,
      (
        -- 1. Presupuesto (30 pts)
        CASE
          WHEN pr.price_max IS NULL THEN 30
          WHEN pr.transaction_type = 'compra' THEN
            CASE
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= pr.price_max THEN 30
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= (pr.price_max * 1.10) THEN 15
              ELSE 0
            END
          WHEN pr.transaction_type = 'alquiler' THEN
            CASE
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= pr.price_max THEN 30
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= (pr.price_max * 1.10) THEN 15
              ELSE 0
            END
          ELSE 0
        END +
        
        -- 2. Ubicación (30 pts: 15 city + 15 neighborhood)
        CASE 
          WHEN array_length(pr.cities, 1) IS NULL AND array_length(pr.neighborhoods, 1) IS NULL THEN 15
          WHEN p.city = ANY(pr.cities) THEN 15 
          ELSE 0 
        END +
        CASE
          WHEN array_length(pr.neighborhoods, 1) IS NULL THEN 5
          WHEN p.neighborhood = ANY(pr.neighborhoods) THEN 15
          ELSE 0
        END +
        
        -- 3. Dormitorios (20 pts)
        CASE 
          WHEN pr.rooms_min IS NULL THEN 20
          WHEN p.bedrooms >= pr.rooms_min THEN 20 
          WHEN p.bedrooms = (pr.rooms_min - 1) THEN 10 
          ELSE 0 
        END +
        
        -- 4. Extras (20 pts)
        CASE 
          WHEN pr.size_min IS NULL THEN 10
          WHEN p.m2_built >= pr.size_min THEN 10 
          ELSE 0 
        END +
        CASE 
          WHEN pr.bathrooms_min IS NULL THEN 5
          WHEN p.bathrooms >= pr.bathrooms_min THEN 5 
          ELSE 0 
        END +
        CASE 
          WHEN pr.garages_min IS NULL THEN 5
          WHEN p.garages >= pr.garages_min THEN 5 
          ELSE 0 
        END
      ) as match_score
    FROM public.prospects pr
    JOIN public.properties p ON p.id = p_property_id
    LEFT JOIN public.agent_profiles ap ON ap.id = pr.agent_id
    WHERE pr.stage NOT IN ('cerrado', 'perdido')
      AND (
        (pr.transaction_type = 'compra' AND (p.transaction_type = 'compra' OR p.transaction_type = 'ambos'))
        OR
        (pr.transaction_type = 'alquiler' AND (p.transaction_type = 'alquiler' OR p.transaction_type = 'ambos'))
      )
  )
  SELECT prospect_id, prospect_name, agent_name, match_score
  FROM scores
  WHERE match_score >= 50
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;

-- ─── END OF MIGRATION: 014_fix_matching.sql ───

-- ─── START OF MIGRATION: 015_add_subscription_and_reviews.sql ───
-- ═══════════════════════════════════════════════════
-- RealHub — 015 Subscription, Featured Properties & Agent Reviews
-- ═══════════════════════════════════════════════════

-- 1. Alter agent_profiles to add subscription and verification status
ALTER TABLE public.agent_profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Alter properties to add featured flags
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

-- 3. Create agent_reviews table
CREATE TABLE IF NOT EXISTS public.agent_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_agent_id UUID REFERENCES public.agent_profiles(id) ON DELETE CASCADE NOT NULL,
  to_agent_id UUID REFERENCES public.agent_profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_agent_review UNIQUE(from_agent_id, to_agent_id),
  CONSTRAINT self_review_check CHECK (from_agent_id != to_agent_id)
);

-- Enable RLS for agent_reviews
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for agent_reviews
CREATE POLICY "Anyone can view agent reviews" 
ON public.agent_reviews FOR SELECT 
USING (true);

CREATE POLICY "Agents can insert reviews for other agents" 
ON public.agent_reviews FOR INSERT 
WITH CHECK (auth.uid() = from_agent_id);

CREATE POLICY "Agents can update/delete their own reviews" 
ON public.agent_reviews FOR UPDATE 
USING (auth.uid() = from_agent_id);

CREATE POLICY "Agents can delete their own reviews" 
ON public.agent_reviews FOR DELETE 
USING (auth.uid() = from_agent_id);

-- 4. Recreate matching functions with currency conversion and strict property type matching
-- Prospect → Property matching
CREATE OR REPLACE FUNCTION match_properties_for_prospect(p_prospect_id UUID)
RETURNS TABLE(property_id UUID, property_title TEXT, agent_name TEXT, match_score INT) AS $$
  WITH prospect_data AS (
    SELECT * FROM public.prospects WHERE id = p_prospect_id
  ),
  scores AS (
    SELECT
      p.id as property_id,
      p.title as property_title,
      ap.full_name as agent_name,
      (
        -- 1. Presupuesto (30 pts) con conversión de moneda (1 USD = 7500 PYG)
        CASE 
          WHEN pr.price_max IS NULL THEN 30
          WHEN pr.transaction_type = 'compra' THEN
            CASE
              -- Ambas en USD o convertidas a USD
              WHEN p.sale_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.sale_price / 7500.0 ELSE p.sale_price END) <= 
                   (CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) THEN 30
              WHEN p.sale_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.sale_price / 7500.0 ELSE p.sale_price END) <= 
                   ((CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) * 1.10) THEN 15
              ELSE 0
            END
          WHEN pr.transaction_type = 'alquiler' THEN
            CASE
              WHEN p.rent_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.rent_price / 7500.0 ELSE p.rent_price END) <= 
                   (CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) THEN 30
              WHEN p.rent_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.rent_price / 7500.0 ELSE p.rent_price END) <= 
                   ((CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) * 1.10) THEN 15
              ELSE 0
            END
          ELSE 0 
        END +
        
        -- 2. Ubicación (30 pts: 15 city + 15 neighborhood)
        CASE 
          WHEN array_length(pr.cities, 1) IS NULL AND array_length(pr.neighborhoods, 1) IS NULL THEN 15
          WHEN p.city = ANY(pr.cities) THEN 15 
          ELSE 0 
        END +
        CASE
          WHEN array_length(pr.neighborhoods, 1) IS NULL THEN 5
          WHEN p.neighborhood = ANY(pr.neighborhoods) THEN 15
          ELSE 0
        END +
        
        -- 3. Dormitorios (20 pts)
        CASE 
          WHEN pr.rooms_min IS NULL THEN 20
          WHEN p.bedrooms >= pr.rooms_min THEN 20 
          WHEN p.bedrooms = (pr.rooms_min - 1) THEN 10 
          ELSE 0 
        END +
        
        -- 4. Extras (20 pts: 10 size + 5 bath + 5 garage)
        CASE 
          WHEN pr.size_min IS NULL THEN 10
          WHEN p.m2_built >= pr.size_min THEN 10 
          ELSE 0 
        END +
        CASE 
          WHEN pr.bathrooms_min IS NULL THEN 5
          WHEN p.bathrooms >= pr.bathrooms_min THEN 5 
          ELSE 0 
        END +
        CASE 
          WHEN pr.garages_min IS NULL THEN 5
          WHEN p.garages >= pr.garages_min THEN 5 
          ELSE 0 
        END
      ) as match_score
    FROM public.properties p
    CROSS JOIN prospect_data pr
    LEFT JOIN public.agent_profiles ap ON ap.id = p.agent_id
    WHERE p.visibility = 'marketplace'
      AND (
        (pr.transaction_type = 'compra' AND (p.transaction_type = 'compra' OR p.transaction_type = 'ambos'))
        OR
        (pr.transaction_type = 'alquiler' AND (p.transaction_type = 'alquiler' OR p.transaction_type = 'ambos'))
      )
      -- Filtro estricto por tipo de propiedad
      AND (
        pr.property_types IS NULL 
        OR array_length(pr.property_types, 1) IS NULL 
        OR p.property_type = ANY(pr.property_types)
      )
  )
  SELECT property_id, property_title, agent_name, match_score
  FROM scores
  WHERE match_score >= 50
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;

-- Property → Prospect matching
CREATE OR REPLACE FUNCTION match_prospects_for_property(p_property_id UUID)
RETURNS TABLE(prospect_id UUID, prospect_name TEXT, agent_name TEXT, match_score INT) AS $$
  WITH scores AS (
    SELECT
      pr.id as prospect_id,
      pr.full_name as prospect_name,
      ap.full_name as agent_name,
      (
        -- 1. Presupuesto (30 pts) con conversión de moneda (1 USD = 7500 PYG)
        CASE
          WHEN pr.price_max IS NULL THEN 30
          WHEN pr.transaction_type = 'compra' THEN
            CASE
              WHEN p.sale_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.sale_price / 7500.0 ELSE p.sale_price END) <= 
                   (CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) THEN 30
              WHEN p.sale_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.sale_price / 7500.0 ELSE p.sale_price END) <= 
                   ((CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) * 1.10) THEN 15
              ELSE 0
            END
          WHEN pr.transaction_type = 'alquiler' THEN
            CASE
              WHEN p.rent_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.rent_price / 7500.0 ELSE p.rent_price END) <= 
                   (CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) THEN 30
              WHEN p.rent_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.rent_price / 7500.0 ELSE p.rent_price END) <= 
                   ((CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) * 1.10) THEN 15
              ELSE 0
            END
          ELSE 0
        END +
        
        -- 2. Ubicación (30 pts: 15 city + 15 neighborhood)
        CASE 
          WHEN array_length(pr.cities, 1) IS NULL AND array_length(pr.neighborhoods, 1) IS NULL THEN 15
          WHEN p.city = ANY(pr.cities) THEN 15 
          ELSE 0 
        END +
        CASE
          WHEN array_length(pr.neighborhoods, 1) IS NULL THEN 5
          WHEN p.neighborhood = ANY(pr.neighborhoods) THEN 15
          ELSE 0
        END +
        
        -- 3. Dormitorios (20 pts)
        CASE 
          WHEN pr.rooms_min IS NULL THEN 20
          WHEN p.bedrooms >= pr.rooms_min THEN 20 
          WHEN p.bedrooms = (pr.rooms_min - 1) THEN 10 
          ELSE 0 
        END +
        
        -- 4. Extras (20 pts)
        CASE 
          WHEN pr.size_min IS NULL THEN 10
          WHEN p.m2_built >= pr.size_min THEN 10 
          ELSE 0 
        END +
        CASE 
          WHEN pr.bathrooms_min IS NULL THEN 5
          WHEN p.bathrooms >= pr.bathrooms_min THEN 5 
          ELSE 0 
        END +
        CASE 
          WHEN pr.garages_min IS NULL THEN 5
          WHEN p.garages >= pr.garages_min THEN 5 
          ELSE 0 
        END
      ) as match_score
    FROM public.prospects pr
    JOIN public.properties p ON p.id = p_property_id
    LEFT JOIN public.agent_profiles ap ON ap.id = pr.agent_id
    WHERE pr.stage NOT IN ('cerrado', 'perdido')
      AND (
        (pr.transaction_type = 'compra' AND (p.transaction_type = 'compra' OR p.transaction_type = 'ambos'))
        OR
        (pr.transaction_type = 'alquiler' AND (p.transaction_type = 'alquiler' OR p.transaction_type = 'ambos'))
      )
      -- Filtro estricto por tipo de propiedad
      AND (
        pr.property_types IS NULL 
        OR array_length(pr.property_types, 1) IS NULL 
        OR p.property_type = ANY(pr.property_types)
      )
  )
  SELECT prospect_id, prospect_name, agent_name, match_score
  FROM scores
  WHERE match_score >= 50
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;

-- ─── END OF MIGRATION: 015_add_subscription_and_reviews.sql ───

-- ─── START OF MIGRATION: 016_add_scraper_tracking.sql ───
-- ═══════════════════════════════════════════════════
-- RealHub — 016 Add Scraper Tracking
-- ═══════════════════════════════════════════════════

-- Alter agent_profiles to add scraper tracking usage count
ALTER TABLE public.agent_profiles 
ADD COLUMN IF NOT EXISTS scraper_searches_used INTEGER DEFAULT 0;

-- ─── END OF MIGRATION: 016_add_scraper_tracking.sql ───

-- ─── START OF MIGRATION: 017_admin_rls_policies.sql ───
-- ═══════════════════════════════════════════════════
-- RealHub — 017 Admin RLS Policies
-- ═══════════════════════════════════════════════════

-- 1. Policies for properties (select, update, delete for admin users)
CREATE POLICY "Admins can select all properties" ON public.properties
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all properties" ON public.properties
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete all properties" ON public.properties
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Policies for prospects (select, update, delete for admin users)
CREATE POLICY "Admins can select all prospects" ON public.prospects
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all prospects" ON public.prospects
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete all prospects" ON public.prospects
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Policies for feature_requests (select, update for admin users)
CREATE POLICY "Admins can select all feature_requests" ON public.feature_requests
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all feature_requests" ON public.feature_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Policies for agent_profiles (update for admin users)
CREATE POLICY "Admins can update all agent_profiles" ON public.agent_profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── END OF MIGRATION: 017_admin_rls_policies.sql ───

-- ─── START OF MIGRATION: 018_add_agent_onboarding_details.sql ───
-- ═══════════════════════════════════════════════════
-- RealHub — 018 Add Agent Onboarding Details
-- ═══════════════════════════════════════════════════

ALTER TABLE public.agent_profiles 
ADD COLUMN IF NOT EXISTS agency_office TEXT,
ADD COLUMN IF NOT EXISTS most_sold_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS has_developments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS developments_details TEXT;

-- ─── END OF MIGRATION: 018_add_agent_onboarding_details.sql ───
