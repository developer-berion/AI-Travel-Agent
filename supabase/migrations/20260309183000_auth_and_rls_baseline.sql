alter table public.operator_profiles enable row level security;
alter table public.operator_profiles alter column id drop default;

create unique index if not exists structured_intakes_quote_session_id_key
on public.structured_intakes (quote_session_id);

create policy "operator reads own profile"
on public.operator_profiles
for select
using (id = auth.uid());

create policy "operator upserts own profile"
on public.operator_profiles
for insert
with check (id = auth.uid());

create policy "operator updates own profile"
on public.operator_profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "service role manages operator profiles"
on public.operator_profiles
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "operator manages quote messages"
on public.quote_messages
for all
using (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = quote_messages.quote_session_id
      and qs.operator_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = quote_messages.quote_session_id
      and qs.operator_id = auth.uid()
  )
);

create policy "operator manages structured intakes"
on public.structured_intakes
for all
using (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = structured_intakes.quote_session_id
      and qs.operator_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = structured_intakes.quote_session_id
      and qs.operator_id = auth.uid()
  )
);

create policy "operator manages shortlists"
on public.shortlists
for all
using (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = shortlists.quote_session_id
      and qs.operator_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = shortlists.quote_session_id
      and qs.operator_id = auth.uid()
  )
);

create policy "operator manages normalized options"
on public.normalized_options
for all
using (
  exists (
    select 1
    from public.shortlists s
    join public.quote_sessions qs on qs.id = s.quote_session_id
    where s.id = normalized_options.shortlist_id
      and qs.operator_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shortlists s
    join public.quote_sessions qs on qs.id = s.quote_session_id
    where s.id = normalized_options.shortlist_id
      and qs.operator_id = auth.uid()
  )
);

create policy "operator manages context snapshots"
on public.quote_context_snapshots
for all
using (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = quote_context_snapshots.quote_session_id
      and qs.operator_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = quote_context_snapshots.quote_session_id
      and qs.operator_id = auth.uid()
  )
);

create policy "operator manages audit events"
on public.audit_events
for all
using (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = audit_events.quote_session_id
      and qs.operator_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.quote_sessions qs
    where qs.id = audit_events.quote_session_id
      and qs.operator_id = auth.uid()
  )
);
