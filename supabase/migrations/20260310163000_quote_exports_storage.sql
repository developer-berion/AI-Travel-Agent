create table if not exists public.quote_exports (
  id uuid primary key default gen_random_uuid(),
  quote_session_id uuid not null references public.quote_sessions(id) on delete cascade,
  snapshot_id uuid not null unique references public.quote_context_snapshots(id) on delete cascade,
  active_quote_version integer not null,
  file_name text not null,
  mime_type text not null,
  storage_bucket text not null,
  storage_path text not null unique,
  file_size_bytes integer not null check (file_size_bytes >= 0),
  created_at timestamptz not null default now()
);

create index if not exists quote_exports_quote_session_id_created_at_idx
on public.quote_exports (quote_session_id, created_at desc);

alter table public.quote_exports enable row level security;

create policy "operator manages quote exports"
on public.quote_exports
for all
using (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = quote_exports.quote_session_id
      and qs.operator_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = quote_exports.quote_session_id
      and qs.operator_id = auth.uid()
  )
);

create policy "service role manages quote exports"
on public.quote_exports
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

insert into storage.buckets (id, name, public)
values ('quote-exports', 'quote-exports', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;
