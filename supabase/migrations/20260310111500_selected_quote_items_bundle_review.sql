create table if not exists public.selected_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_session_id uuid not null references public.quote_sessions(id) on delete cascade,
  service_line text not null,
  option_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_session_id, service_line)
);

alter table public.selected_quote_items enable row level security;

create policy "operator manages selected quote items"
on public.selected_quote_items
for all
using (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = selected_quote_items.quote_session_id
      and qs.operator_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = selected_quote_items.quote_session_id
      and qs.operator_id = auth.uid()
  )
);

create policy "service role manages selected quote items"
on public.selected_quote_items
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
