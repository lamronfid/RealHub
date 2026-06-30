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
