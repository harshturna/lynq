-- Row-level security. Before this, no table had RLS and the anon role held
-- GRANT ALL on every table, so the public anon key could read, write and
-- delete all data (TICKET-008). After this:
--   * anon can do nothing in public;
--   * authenticated users see and manage only their own websites, and can
--     read (never write) the event rows that belong to those websites;
--   * the ingest route writes with the service-role key, which bypasses RLS
--     (lib/ingest.ts). Deploy that code BEFORE applying this migration or
--     tracking stops.
-- See TICKET-009.

alter table public.websites      enable row level security;
alter table public.visitors      enable row level security;
alter table public.sessions      enable row level security;
alter table public.page_views    enable row level security;
alter table public.vitals        enable row level security;
alter table public.custom_events enable row level security;

-- The anon role keeps schema usage (PostgREST needs it) but loses every table
-- and sequence privilege, now and for tables created later.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables    from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;

-- websites: owner has full control
create policy "websites: owner select" on public.websites
  for select to authenticated using (user_id = auth.uid());
create policy "websites: owner insert" on public.websites
  for insert to authenticated with check (user_id = auth.uid());
create policy "websites: owner update" on public.websites
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "websites: owner delete" on public.websites
  for delete to authenticated using (user_id = auth.uid());

-- Event tables: owners read their sites' rows. No write policies: the app
-- never writes these as a user, only through the service role.
create policy "visitors: owner select" on public.visitors
  for select to authenticated
  using (website_url in (select url from public.websites where user_id = auth.uid()));
create policy "sessions: owner select" on public.sessions
  for select to authenticated
  using (website_url in (select url from public.websites where user_id = auth.uid()));
create policy "page_views: owner select" on public.page_views
  for select to authenticated
  using (website_url in (select url from public.websites where user_id = auth.uid()));
create policy "vitals: owner select" on public.vitals
  for select to authenticated
  using (website_url in (select url from public.websites where user_id = auth.uid()));
create policy "custom_events: owner select" on public.custom_events
  for select to authenticated
  using (website_url in (select url from public.websites where user_id = auth.uid()));
