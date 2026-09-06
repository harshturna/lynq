-- TICKET-049 / D-015: a per-day rollup serves every unfiltered breakdown.
-- One row per UTC day, dimension and value with summed counts; the partial
-- days at either end of a range and the days housekeeping has not reached
-- are read from the events through the same function that fills the table.

create table if not exists analytics.rollup_daily (
  site_id           bigint not null references public.websites(id) on delete cascade,
  day               date   not null,
  dimension         text   not null,
  value             text   not null,
  visitors          integer not null,   -- distinct anonymous visitor ids that day (ids rotate daily, D-003)
  pageviews         integer not null,
  custom_events     integer not null,
  sessions          integer not null,
  bounced           integer not null,
  engaged_ms        bigint  not null,
  session_pageviews bigint  not null,
  time_on_site_ms   bigint  not null,
  primary key (site_id, dimension, day, value)
);

-- The day the fill has reached for a site; the read path takes raw rows after it.
create table if not exists analytics.rollup_state (
  site_id        bigint primary key references public.websites(id) on delete cascade,
  rolled_through date not null,
  updated_at     timestamptz not null default now()
);

-- Identified users keep one id across days, so their distinct count over a
-- range comes from the rows; this keeps that read to the identified rows.
create index if not exists events_site_ts_identified
  on analytics.events (site_id, ts) where user_hash <> 0;

-- The session definition (design §6.3) in SQL, aggregated by one dimension
-- over a window. Mirrors sessionCte() in lib/query/sessions.ts; a test pins
-- the two equal. `visitors` counts anonymous ids only, `visitors_ident` the
-- identified ones. With p_identified_only the window is limited to identified
-- rows, which is how the read path counts them over a whole range.
create or replace function analytics.rollup_window(
  p_site bigint, p_dim text, p_from timestamptz, p_to timestamptz, p_identified_only boolean default false)
returns table (
  value text, visitors integer, visitors_ident integer, pageviews integer, custom_events integer,
  sessions integer, bounced integer, engaged_ms bigint, session_pageviews bigint, time_on_site_ms bigint)
language sql stable as $$
  with sess as (
    select e.visitor_id, e.session_id,
      coalesce(sum(e.engaged_ms), 0)::bigint as duration_ms,
      (extract(epoch from (max(e.ts) - min(e.ts))) * 1000)::bigint as time_on_site_ms,
      count(*) filter (where e.event = 'pageview')::int as pageviews,
      (array_agg(e.path order by e.ts, e.seq, e.pageview_id) filter (where e.event = 'pageview'))[1] as entry_path,
      (array_agg(e.path order by e.ts desc, e.seq desc, e.pageview_id desc) filter (where e.event = 'pageview'))[1] as exit_path,
      (array_agg(jsonb_build_object(
          'referrer', e.referrer, 'source', e.source, 'channel', e.channel,
          'utm_source', e.utm_source, 'utm_medium', e.utm_medium, 'utm_campaign', e.utm_campaign,
          'utm_term', e.utm_term, 'utm_content', e.utm_content)
        order by e.ts, e.seq, e.pageview_id) filter (where e.event = 'pageview'))[1] as entry,
      (count(*) filter (where e.event = 'pageview') = 1
        and coalesce(sum(e.engaged_ms), 0) < 10000
        and count(*) filter (where e.event = 'custom') = 0) as bounced
    from analytics.events e
    where e.site_id = p_site and e.ts >= p_from and e.ts < p_to and not e.suspect
      and (not p_identified_only or e.user_hash <> 0)
    group by 1, 2),
  keyed as (
    select e.visitor_id, e.session_id, e.event, e.user_hash,
      case p_dim
        when 'path' then e.path
        when 'country' then e.country
        when 'region' then e.region
        when 'city' then e.city
        when 'device' then e.device
        when 'browser' then e.browser
        when 'os' then e.os
        when 'entry_path' then s.entry_path
        when 'exit_path' then s.exit_path
        when 'entry_referrer' then s.entry ->> 'referrer'
        when 'entry_source' then s.entry ->> 'source'
        when 'entry_channel' then s.entry ->> 'channel'
        when 'entry_utm_source' then s.entry ->> 'utm_source'
        when 'entry_utm_medium' then s.entry ->> 'utm_medium'
        when 'entry_utm_campaign' then s.entry ->> 'utm_campaign'
        when 'entry_utm_term' then s.entry ->> 'utm_term'
        when 'entry_utm_content' then s.entry ->> 'utm_content'
      end as value
    from analytics.events e join sess s using (visitor_id, session_id)
    where e.site_id = p_site and e.ts >= p_from and e.ts < p_to and not e.suspect
      and (not p_identified_only or e.user_hash <> 0)),
  rowm as materialized (
    select value,
      count(distinct visitor_id) filter (where user_hash = 0)::int as visitors,
      count(distinct visitor_id) filter (where user_hash <> 0)::int as visitors_ident,
      count(*) filter (where event = 'pageview')::int as pageviews,
      count(*) filter (where event = 'custom')::int as custom_events
    from keyed where value is not null group by 1),
  pairs as (select distinct value, visitor_id, session_id from keyed where value is not null),
  sessm as materialized (
    select p.value, count(*)::int as sessions, count(*) filter (where s.bounced)::int as bounced,
      sum(s.duration_ms)::bigint as engaged_ms, sum(s.pageviews)::bigint as session_pageviews,
      sum(s.time_on_site_ms)::bigint as time_on_site_ms
    from pairs p join sess s using (visitor_id, session_id) group by 1)
  select r.value, r.visitors, r.visitors_ident, r.pageviews, r.custom_events,
    m.sessions, m.bounced, m.engaged_ms, m.session_pageviews, m.time_on_site_ms
  from rowm r join sessm m using (value)
$$;

-- Fills rollup_daily for every live site from the day after its state (or its
-- first event) through p_through, a day and a dimension at a time, then moves
-- the state. Two days back by default: a client timestamp may trail receipt
-- by 24 hours (lib/ingest/time-bounds.ts), so yesterday is not final at 00:20.
create or replace function analytics.rollup_refresh(p_through date default (current_date - 2))
returns void language plpgsql as $$
declare
  dims constant text[] := array['path', 'entry_path', 'exit_path',
    'entry_referrer', 'entry_source', 'entry_channel', 'entry_utm_source', 'entry_utm_medium',
    'entry_utm_campaign', 'entry_utm_term', 'entry_utm_content',
    'country', 'region', 'city', 'device', 'browser', 'os'];
  site record;
  d date;
  dim text;
begin
  for site in
    select w.id as site_id,
      coalesce(st.rolled_through, (select (min(ts) at time zone 'UTC')::date from analytics.events where site_id = w.id) - 1) as through
    from public.websites w
    left join analytics.rollup_state st on st.site_id = w.id
    where w.deleted_at is null
  loop
    if site.through is null then continue; end if;
    d := site.through + 1;
    while d <= p_through loop
      foreach dim in array dims loop
        delete from analytics.rollup_daily
          where site_id = site.site_id and dimension = dim and day = d;
        insert into analytics.rollup_daily
          (site_id, day, dimension, value, visitors, pageviews, custom_events,
           sessions, bounced, engaged_ms, session_pageviews, time_on_site_ms)
        select site.site_id, d, dim, w.value, w.visitors, w.pageviews, w.custom_events,
           w.sessions, w.bounced, w.engaged_ms, w.session_pageviews, w.time_on_site_ms
        from analytics.rollup_window(site.site_id, dim,
          d::timestamp at time zone 'UTC', (d + 1)::timestamp at time zone 'UTC') w;
      end loop;
      d := d + 1;
    end loop;
    if site.through < p_through then
      insert into analytics.rollup_state (site_id, rolled_through, updated_at)
        values (site.site_id, p_through, now())
        on conflict (site_id) do update set rolled_through = excluded.rolled_through, updated_at = now();
    end if;
  end loop;
end $$;

create or replace function analytics.housekeeping() returns void language sql as $$
  delete from analytics.events           where ts < now() - interval '24 months';
  delete from analytics.rollup_daily     where day < (now() - interval '24 months')::date;
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
