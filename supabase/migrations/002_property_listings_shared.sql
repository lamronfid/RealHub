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
