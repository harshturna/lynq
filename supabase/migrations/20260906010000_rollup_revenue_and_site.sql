-- TICKET-049 / D-015, second step: the rollup also carries revenue and
-- payments (the Sources tables show revenue when a site has any) and a
-- 'site' dimension whose one value '' is the site total, which the summary
-- reads. The return type changes, so the function is dropped and recreated;
-- the state is cleared so the next refresh fills every day again.

alter table analytics.rollup_daily
  add column if not exists revenue  numeric not null default 0,
  add column if not exists payments integer not null default 0;

drop function if exists analytics.rollup_window(bigint, text, timestamptz, timestamptz, boolean);

create or replace function analytics.rollup_window(
  p_site bigint, p_dim text, p_from timestamptz, p_to timestamptz, p_identified_only boolean default false)
returns table (
  value text, visitors integer, visitors_ident integer, pageviews integer, custom_events integer,
  sessions integer, bounced integer, engaged_ms bigint, session_pageviews bigint, time_on_site_ms bigint,
  revenue numeric, payments integer)
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
    select e.visitor_id, e.session_id, e.event, e.user_hash, e.revenue,
      case p_dim
        when 'site' then ''
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
      count(*) filter (where event = 'custom')::int as custom_events,
      coalesce(sum(revenue), 0)::numeric as revenue,
      count(*) filter (where revenue is not null)::int as payments
    from keyed where value is not null group by 1),
  pairs as (select distinct value, visitor_id, session_id from keyed where value is not null),
  sessm as materialized (
    select p.value, count(*)::int as sessions, count(*) filter (where s.bounced)::int as bounced,
      sum(s.duration_ms)::bigint as engaged_ms, sum(s.pageviews)::bigint as session_pageviews,
      sum(s.time_on_site_ms)::bigint as time_on_site_ms
    from pairs p join sess s using (visitor_id, session_id) group by 1)
  select r.value, r.visitors, r.visitors_ident, r.pageviews, r.custom_events,
    m.sessions, m.bounced, m.engaged_ms, m.session_pageviews, m.time_on_site_ms, r.revenue, r.payments
  from rowm r join sessm m using (value)
$$;

create or replace function analytics.rollup_refresh(p_through date default (current_date - 2))
returns void language plpgsql as $$
declare
  dims constant text[] := array['site', 'path', 'entry_path', 'exit_path',
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
           sessions, bounced, engaged_ms, session_pageviews, time_on_site_ms, revenue, payments)
        select site.site_id, d, dim, w.value, w.visitors, w.pageviews, w.custom_events,
           w.sessions, w.bounced, w.engaged_ms, w.session_pageviews, w.time_on_site_ms, w.revenue, w.payments
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

delete from analytics.rollup_daily;
delete from analytics.rollup_state;
