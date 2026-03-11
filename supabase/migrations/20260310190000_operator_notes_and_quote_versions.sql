create table if not exists public.operator_notes (
  id uuid primary key default gen_random_uuid(),
  quote_session_id uuid not null unique references public.quote_sessions(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  quote_session_id uuid not null references public.quote_sessions(id) on delete cascade,
  version_number integer not null check (version_number >= 0),
  version_state text not null check (version_state in ('active', 'superseded')),
  coverage_state text not null check (coverage_state in ('full', 'partial', 'not-ready')),
  change_reason text not null,
  diff_summary text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_session_id, version_number)
);

create index if not exists quote_versions_quote_session_id_version_number_idx
on public.quote_versions (quote_session_id, version_number desc);

alter table public.operator_notes enable row level security;
alter table public.quote_versions enable row level security;

create policy "operator manages operator notes"
on public.operator_notes
for all
using (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = operator_notes.quote_session_id
      and qs.operator_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = operator_notes.quote_session_id
      and qs.operator_id = auth.uid()
  )
);

create policy "service role manages operator notes"
on public.operator_notes
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "operator manages quote versions"
on public.quote_versions
for all
using (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = quote_versions.quote_session_id
      and qs.operator_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = quote_versions.quote_session_id
      and qs.operator_id = auth.uid()
  )
);

create policy "service role manages quote versions"
on public.quote_versions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
