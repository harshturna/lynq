-- Summary stats for an arbitrary window, used for period-over-period deltas
-- on the dashboard stat cards.
--
-- Why an RPC: only four scalars are ever needed from the comparison window,
-- never its rows. Fetching rows would double an already-heavy payload and
-- would be subject to the same 5000-row cap the dashboard queries use.
--
-- SECURITY INVOKER (the default) is deliberate: the function must run with
-- the caller's privileges so the existing RLS policies on page_views and
-- sessions still apply. Do not change this to SECURITY DEFINER.

create or replace function public.get_period_summary(
  p_website_url text,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  views_count bigint,
  visitors_count bigint,
  average_session_duration numeric,
  bounce_rate numeric
)
language sql
stable
as $$
  with period_views as (
    select count(*) as views
    from public.page_views
    where website_url = p_website_url
      and created_at >= p_from
      and created_at <= p_to
  ),
  period_sessions as (
    select client_id, session_duration
    from public.sessions
    where website_url = p_website_url
      and created_at >= p_from
      and created_at <= p_to
  )
  select
    (select views from period_views)::bigint as views_count,
    (select count(distinct client_id) from period_sessions)::bigint
      as visitors_count,
    -- Mirrors calculateAverageSessionDuration in lib/utils.ts: milliseconds
    -- converted to minutes, rounded to 2dp
    coalesce(
      round(
        (avg(coalesce(session_duration, 0)) / 60000.0)::numeric, 2
      ), 0
    ) as average_session_duration,
    -- Mirrors calculateBounceRate in lib/utils.ts: a bounce is a session
    -- shorter than 10 seconds. Keep this threshold in sync with the JS.
    coalesce(
      round(
        (count(*) filter (where session_duration < 10000)::numeric
          / nullif(count(*), 0)::numeric) * 100, 2
      ), 0
    ) as bounce_rate
  from period_sessions;
$$;

grant execute on function public.get_period_summary(text, timestamptz, timestamptz)
  to authenticated;
