-- Composite indexes for the dashboard's range queries. Every read filters
-- website_url plus a created_at (or last_visited) range; without these each
-- query is a sequential scan. See TICKET-010.
--
-- Plain create index (not concurrently): it must run inside the migration
-- transaction, and the tables are small enough for the brief lock.

create index if not exists page_views_site_time_idx
  on public.page_views (website_url, created_at);

create index if not exists sessions_site_time_idx
  on public.sessions (website_url, created_at);

create index if not exists vitals_site_time_idx
  on public.vitals (website_url, created_at);

create index if not exists custom_events_site_time_idx
  on public.custom_events (website_url, created_at);

create index if not exists visitors_site_last_visited_idx
  on public.visitors (website_url, last_visited);
