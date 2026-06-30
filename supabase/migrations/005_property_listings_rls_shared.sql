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
