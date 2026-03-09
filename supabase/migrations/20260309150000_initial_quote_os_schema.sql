create extension if not exists "pgcrypto";

create table if not exists public.operator_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('operator', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.quote_sessions (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operator_profiles(id),
  title text not null,
  agency_name text not null,
  trip_label text not null,
  trip_start_date date,
  status text not null,
  commercial_status text not null,
  recommendation_mode text not null,
  active_quote_version integer not null default 0,
  latest_context_summary text not null default '',
  pending_question text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_messages (
  id uuid primary key default gen_random_uuid(),
  quote_session_id uuid not null references public.quote_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.structured_intakes (
  id uuid primary key default gen_random_uuid(),
  quote_session_id uuid not null references public.quote_sessions(id) on delete cascade,
  requested_service_lines jsonb not null,
  extracted_fields jsonb not null,
  missing_fields jsonb not null,
  contradictions jsonb not null default '[]'::jsonb,
  readiness_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.shortlists (
  id uuid primary key default gen_random_uuid(),
  quote_session_id uuid not null references public.quote_sessions(id) on delete cascade,
  service_line text not null,
  weak_shortlist boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.normalized_options (
  id uuid primary key default gen_random_uuid(),
  shortlist_id uuid not null references public.shortlists(id) on delete cascade,
  service_line text not null,
  title text not null,
  destination text not null,
  headline_price numeric(12,2) not null,
  currency text not null,
  why_it_fits text not null,
  tradeoff text not null,
  caveat text,
  availability_state text not null,
  supplier_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.quote_context_snapshots (
  id uuid primary key default gen_random_uuid(),
  quote_session_id uuid not null references public.quote_sessions(id) on delete cascade,
  summary text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  quote_session_id uuid not null references public.quote_sessions(id) on delete cascade,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.quote_sessions enable row level security;
alter table public.quote_messages enable row level security;
alter table public.structured_intakes enable row level security;
alter table public.shortlists enable row level security;
alter table public.normalized_options enable row level security;
alter table public.quote_context_snapshots enable row level security;
alter table public.audit_events enable row level security;

create policy "operator owns quote sessions"
on public.quote_sessions
for all
using (operator_id = auth.uid())
with check (operator_id = auth.uid());

create policy "operator reads quote children"
on public.quote_messages
for select
using (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = quote_messages.quote_session_id
      and qs.operator_id = auth.uid()
  )
);

create policy "service role manages quote children"
on public.quote_messages
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
