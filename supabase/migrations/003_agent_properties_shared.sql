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
