-- TICKET-013: hostname normalisation and the site_hostnames seed (design §7.3).
-- Re-runnable: the seed inserts with on conflict do nothing.

create or replace function analytics.normalise_hostname(input text) returns text
language sql immutable as $$
  select case when h ~ '^[a-z0-9.-]+$' then h end from (select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          split_part(
            regexp_replace(
              regexp_replace(lower(trim(input)), '^[a-z][a-z0-9+.-]*://', ''),
              '^[^@]*@', ''),
            '/', 1),
          ':[0-9]+$', ''),
        '\.+$', ''),
      '^www\.', ''),
    '') as h) n
$$;

create or replace function analytics.seed_hostnames() returns integer
language sql as $$
  with rows as (
    insert into analytics.site_hostnames (site_id, hostname)
    select id, analytics.normalise_hostname(url)
    from public.websites
    where analytics.normalise_hostname(url) is not null
    on conflict do nothing
    returning 1
  )
  select count(*)::int from rows
$$;

select analytics.seed_hostnames();
