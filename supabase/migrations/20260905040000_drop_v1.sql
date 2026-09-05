-- TICKET-024 (D-007): v1 is retired. The old event tables, their owner-select
-- policies, the period-summary RPC the old dashboard used, and the visitors
-- counter the v1 route incremented all go. Everything reads analytics.events.
drop function if exists public.get_period_summary(text, timestamptz, timestamptz);

drop table if exists public.page_views;
drop table if exists public.custom_events;
drop table if exists public.vitals;
drop table if exists public.sessions;
drop table if exists public.visitors;

alter table public.websites drop column if exists visitors;
