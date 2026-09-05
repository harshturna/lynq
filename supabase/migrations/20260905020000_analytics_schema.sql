-- Phase 0, TICKET-012: the analytics schema (design docs/design/phase-0-data-foundation.md §4, §4.2, §14).
-- Every statement here is re-runnable so the CI container and a shadow database can apply the same file.

create schema if not exists analytics;
grant usage on schema analytics to service_role;
alter default privileges in schema analytics grant all on tables to service_role;
alter default privileges in schema analytics grant all on sequences to service_role;

-- Sites are soft-deleted from the UI; housekeeping removes their events in batches, then the row (§14).
alter table public.websites add column if not exists deleted_at timestamptz;

create table if not exists analytics.events (
  id               bigint generated always as identity primary key,
  site_id          bigint      not null references public.websites(id) on delete cascade,
  ts               timestamptz not null,
  received_at      timestamptz not null default now(),
  seq              integer     not null default 0,
  event            text        not null check (event in ('pageview','engagement','custom','vitals','identify')),
  name             text        not null default '',

  visitor_id       bigint      not null,
  session_id       bigint      not null,
  user_hash        bigint      not null default 0,
  pageview_id      bigint      not null,

  hostname         text not null,
  path             text not null,
  title            text not null default '',
  query            text not null default '',

  referrer         text not null default '',
  referrer_url     text not null default '',
  source           text not null default '',
  channel          text not null default '',
  utm_source       text not null default '',
  utm_medium       text not null default '',
  utm_campaign     text not null default '',
  utm_term         text not null default '',
  utm_content      text not null default '',

  country          text not null default '',
  region           text not null default '',
  city             text not null default '',
  device           text not null default '',
  browser          text not null default '',
  browser_major    smallint not null default 0,
  browser_version  text not null default '',
  os               text not null default '',
  os_version       text not null default '',
  screen_width     smallint not null default 0,
  screen_height    smallint not null default 0,
  language         text not null default '',

  engaged_ms       integer  not null default 0,
  scroll_depth     smallint not null default 0,

  props            jsonb    not null default '{}'::jsonb,
  revenue          numeric,

  lcp real, cls real, inp real, fcp real, ttfb real, dcl real, load real, tti real, tbt real,
  resources smallint,
  lcp_target text, inp_target text,

  suspect          boolean  not null default false,
  ingest_version   smallint not null
);

create index if not exists events_site_ts      on analytics.events (site_id, ts);
create index if not exists events_site_session on analytics.events (site_id, visitor_id, session_id);
create index if not exists events_custom_name  on analytics.events (site_id, name, ts) where event = 'custom';

create table if not exists analytics.site_hostnames (
  site_id   bigint not null references public.websites(id) on delete cascade,
  hostname  text   not null,
  primary key (site_id, hostname),
  unique (hostname)
);

create table if not exists analytics.site_settings (
  site_id         bigint primary key references public.websites(id) on delete cascade,
  timezone        text    not null default 'UTC',
  store_titles    boolean not null default false,
  store_user_ids  boolean not null default false,
  excluded_ips    cidr[]  not null default '{}',
  excluded_paths  text[]  not null default '{}'
);

create table if not exists analytics.visitor_salts (
  day        date primary key,
  salt       bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists analytics.identified_users (
  site_id    bigint not null references public.websites(id) on delete cascade,
  user_hash  bigint not null,
  user_id    text   not null,
  last_seen  timestamptz not null default now(),
  primary key (site_id, user_hash)
);

create table if not exists analytics.ingest_log (
  ts        timestamptz not null default now(),
  hostname  text        not null,
  site_id   bigint,
  stage     text        not null,
  detail    text        not null default ''
);
create index if not exists ingest_log_hostname_ts on analytics.ingest_log (hostname, ts);

-- One housekeeping function: retention (D-005), salts, identified users, ingest log, soft-deleted sites.
create or replace function analytics.housekeeping() returns void language sql as $$
  delete from analytics.events           where ts < now() - interval '24 months';
  delete from analytics.visitor_salts    where day < current_date - 2;
  delete from analytics.identified_users where last_seen < now() - interval '90 days';
  delete from analytics.ingest_log       where ts < now() - interval '30 days';
  delete from analytics.events e
    using public.websites w
    where e.site_id = w.id and w.deleted_at is not null
      and e.id in (select id from analytics.events where site_id = w.id limit 50000);
  delete from public.websites w
    where w.deleted_at is not null
      and not exists (select 1 from analytics.events where site_id = w.id);
$$;

-- Nightly schedule, guarded so the same file applies where pg_cron is absent (CI container).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'lynq_housekeeping';
    perform cron.schedule('lynq_housekeeping', '20 0 * * *', 'select analytics.housekeeping()');
  end if;
end $$;
