-- TICKET-034 (design §11): the Phase 1 schema. Goals, the settings the new
-- screens read, viewport size on events, two indexes, and the first-visit
-- flag the old dashboard used.
create table public.goals (
  id          bigint generated always as identity primary key,
  site_id     bigint not null references public.websites(id) on delete cascade,
  name        text not null,
  kind        text not null check (kind in ('pageview','event')),
  match       text not null,             -- path glob or event name
  revenue     boolean not null default false,
  target      integer,                    -- completions per month, optional
  created_at  timestamptz not null default now()
);
alter table public.goals enable row level security;
revoke all on public.goals from anon, authenticated;   -- the default privilege grants them; goals are read through postgres.js only
create policy "goals: owner all" on public.goals for all to authenticated
  using      (site_id in (select id from public.websites where user_id = auth.uid()))
  with check (site_id in (select id from public.websites where user_id = auth.uid()));

alter table analytics.site_settings
  add column kpi_goal_id      bigint references public.goals(id) on delete set null,
  add column retention_months smallint not null default 24,
  add column breakpoints      smallint[] not null default '{640,1024,1280}',
  add column shortcuts        boolean not null default true;

alter table analytics.events
  add column viewport_width  smallint not null default 0,
  add column viewport_height smallint not null default 0;

create index events_site_received on analytics.events (site_id, received_at);
create index events_site_ts_custom on analytics.events (site_id, ts) where event = 'custom';
-- the prop_key breakdown's lateral join over jsonb_object_keys (design §9 budget paragraph)
-- is served by events_site_ts_custom as well; no separate index.

alter table public.websites drop column is_first_visit;
