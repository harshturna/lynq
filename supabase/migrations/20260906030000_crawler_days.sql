-- TICKET-075 / D-018: crawler hits, one row per site, day, crawler and path.
-- Its own table, never analytics.events, so no visitor number can move
-- because a crawler visited. Filled by /api/bots with hits = hits + n.

create table if not exists analytics.crawler_days (
  site_id     bigint   not null references public.websites(id) on delete cascade,
  day         date     not null,
  crawler     text     not null,
  -- answers · training · search · social · seo · other (lib/ingest/crawlers.ts)
  family      text     not null check (family in ('answers','training','search','social','seo','other')),
  -- the path requested, or robots.txt / llms.txt / sitemap when it is one of those
  path        text     not null,
  hits        integer  not null default 0 check (hits >= 0),
  last_status smallint not null default 0,
  last_seen   timestamptz not null default now(),
  primary key (site_id, day, crawler, path)
);

create or replace function analytics.housekeeping() returns void language sql as $$
  delete from analytics.events           where ts < now() - interval '24 months';
  delete from analytics.rollup_daily     where day < (now() - interval '24 months')::date;
  delete from analytics.crawler_days     where day < (now() - interval '24 months')::date;
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
  select analytics.rollup_refresh();
$$;
