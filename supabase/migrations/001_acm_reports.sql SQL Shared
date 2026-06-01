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
