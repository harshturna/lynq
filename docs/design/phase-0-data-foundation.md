# Phase 0: the data foundation

Status: v6, final · Ticket: TICKET-022 · Decisions: D-001, D-003, D-004, D-005, D-006

## 0. Framing

Lynq is a portfolio project that wants every powerful analytics feature and none of the scale
engineering. Events live in the existing Supabase Postgres (D-006), in one table, with a few
indexes, read and written by one library. The query layer is the only place with SQL, so the
store could be swapped later; nothing else about scale is planned.

Four reviews shaped this document. Reviews 1 to 3 ran against a ClickHouse version and their
correctness and privacy findings are preserved. Review 4 ran against the Postgres version and
cut what remained of the scale apparatus while restoring several correctness rules. Appendix A
lists both.

Kept from the start: the wide event row with page, session and request context on every row
(§4, §7.1); the client session id as the one session definition (§6); the ingest pipeline
order, gates, time bounds and `suspect` marking (§7); tracker v2 (§8); the query layer with the
`authorize()` seam (§9); the backfill (§10); the definitions of bounce, duration, entry and
exit (§6.3).

## 1. Purpose and scope

Phase 0 replaces the way Lynq stores and reads analytics data. It ships nothing visible. When it
is done, every event lands in one Postgres table through a validating ingest API, the tracker
is rewritten, historical data is backfilled, and the dashboard's numbers can be reproduced from
the new table before Phase 1 switches it over.

In scope: the `analytics` schema; ingest API v2; tracker v2 served first-party; backfill; the
v1 route writing to both stores during the transition; the query layer's four primitives,
session definitions, ranges with timezone, and the authorization seam; tests and CI.

Out of scope: any dashboard change (Phase 1); funnel, path and retention screens (Phase 3);
rate limiting; MaxMind geo; session replay and heatmaps; autocapture; annotations (Phase 2);
error tracking columns (Phase 3 adds them with an `alter table`, which is instantaneous);
scheduled jobs beyond the one `pg_cron` housekeeping call.

## 2. Constraints

- D-001: this phase comes before the UI overhaul and before new features.
- D-003: visitors are identified by a daily-rotating salted hash by default; `lynq.identify()`
  opts a site into stable ids for logged-in users.
- D-004: the five visible cutover changes are accepted (§15).
- D-005: retention 24 months; GPC always honoured; DNT only with `data-respect-dnt`;
  `store_user_ids` and `store_titles` off; v1 removed after 30 quiet days.
- D-006: events in Supabase Postgres. No partitioning, no rollups, no second store.
- Hosting stays Vercel and Supabase. Everything runs in Vercel functions or one-off scripts.
- Existing v1 installs keep working, unchanged, through the whole phase.
- Privacy claims on the landing page must be literally true: no cookies, no persistent
  identifiers, nothing stored in the browser except a per-tab session record that dies with the
  tab and, only if the visitor asks for it, an opt-out flag. The copy changes at v1 sunset.

## 3. Architecture

```
browser ── tracker v2 ──▶ POST /api/collect ──▶ validate, bound, enrich, hash ──▶ analytics.events
                                                     │                                 ▲
old installs ── tracker v1 ──▶ POST /api/lynq ───────┤ (dual-write: old tables + adapter to events)
                                                     ▼
                                          analytics: hostnames, settings, salts, identified users

dashboard (Phase 1) ──▶ authorize(principal, site) ──▶ lib/query (parameterised SQL) ──▶ analytics.events
```

One Supabase project. Everything analytics lives in the `analytics` schema, which is not in
PostgREST's exposed schemas, so supabase-js and the anon and authenticated roles cannot reach
it at all. Server code reaches it through `postgres.js` over the Supabase transaction pooler
(§14), for both the ingest insert and the query layer. Tenant isolation for analytics is the
`authorize()` step plus a mandatory `site_id` predicate in every query (§9.4); the app tables
in `public` keep their RLS from TICKET-009.

| Component | Where | Notes |
|---|---|---|
| Tracker v2 | `packages/tracker`, built to `public/js/` | First-party, cached at the edge (§8.1) |
| Ingest v2 | `app/api/collect/route.ts` | Node runtime, `maxDuration = 5` |
| Ingest v1 adapter | `app/api/lynq/route.ts` | Keeps writing the old tables, and maps each event to `events` rows |
| Auth proxy | `proxy.ts` | Matcher excludes `/api/collect`, `/api/lynq`, `/js/` (§7.10) |
| Event store | `analytics.*` (§4) | Supabase migrations |
| Query layer | `lib/query/*` | The only SQL against `analytics`; entered only through `authorize()` |
| Backfill | `scripts/backfill-events.mjs` | One-off, idempotent, bounded by `--until` |

## 4. Event model

One wide table. One row per pageview, custom event, engagement update, vitals report, or
identify. Sessions are not rows; they are defined by the client session id (§6).

```sql
create schema analytics;
grant usage on schema analytics to service_role;                 -- the pooler role used by postgres.js
alter default privileges in schema analytics grant all on tables to service_role;

create table analytics.events (
  id               bigint generated always as identity primary key,
  site_id          bigint      not null references public.websites(id) on delete cascade,
  ts               timestamptz not null,           -- client time, bounded by ingest (§7.2); never rewritten
  received_at      timestamptz not null default now(),  -- server time; the realtime clock (§16)
  seq              integer     not null default 0, -- tracker's per-tab counter (§6.1)
  event            text        not null check (event in ('pageview','engagement','custom','vitals','identify')),
  name             text        not null default '',

  visitor_id       bigint      not null,           -- §5; signed reinterpretation of the 64-bit hash
  session_id       bigint      not null,           -- §6, generated by the tracker
  user_hash        bigint      not null default 0, -- §5.2; 0 means anonymous and is excluded from every identity query
  pageview_id      bigint      not null,           -- generated by the tracker

  -- page context, on every row (§7.1)
  hostname         text not null,
  path             text not null,                  -- ≤ 2048, cap enforced at ingest
  title            text not null default '',       -- ≤ 512, only with store_titles
  query            text not null default '',       -- allow-listed params only

  -- session context, on every row (§7.4)
  referrer         text not null default '',
  referrer_url     text not null default '',
  source           text not null default '',
  channel          text not null default '',       -- Direct | Organic Search | Social | Referral | Email | Paid | Unknown
  utm_source       text not null default '',
  utm_medium       text not null default '',
  utm_campaign     text not null default '',
  utm_term         text not null default '',
  utm_content      text not null default '',

  -- request context, per batch (§7.2)
  country          text not null default '',       -- ISO 3166-1 alpha-2
  region           text not null default '',
  city             text not null default '',
  device           text not null default '',       -- desktop | mobile | tablet
  browser          text not null default '',
  browser_major    smallint not null default 0,
  browser_version  text not null default '',
  os               text not null default '',
  os_version       text not null default '',
  screen_width     smallint not null default 0,
  screen_height    smallint not null default 0,
  language         text not null default '',

  engaged_ms       integer  not null default 0,    -- engagement rows
  scroll_depth     smallint not null default 0,    -- engagement rows

  props            jsonb    not null default '{}'::jsonb,   -- custom event properties; the one genuinely dynamic field
  revenue          numeric,                        -- custom rows with a numeric `revenue` prop, minor units (§7.6)

  -- vitals rows: fixed keys, so real columns; NULL means "not reported" and drops out of percentiles for free
  lcp real, cls real, inp real, fcp real, ttfb real, dcl real, load real, tti real, tbt real,
  resources smallint,
  lcp_target text, inp_target text,

  suspect          boolean  not null default false,          -- soft check failed (§7.2); excluded by default
  ingest_version   smallint not null                         -- 0 backfill, 1 v1 adapter, 2 v2
);

create index events_site_ts       on analytics.events (site_id, ts);
create index events_site_session  on analytics.events (site_id, visitor_id, session_id);
create index events_custom_name   on analytics.events (site_id, name, ts) where event = 'custom';
```

Why this shape:

- One wide row with page, session and request context on every event, so no metric needs a
  join. This is what makes "explain this change by source, page, country or device" a single
  group-by later, and it is what every review said to keep.
- `(site_id, ts)` is the index every query uses: one site, one range. Aggregates over a day of
  one site's rows are microseconds; nothing here needs a sort-free walk. `(site_id, visitor_id,
  session_id)` serves the single-session drill-down. The partial index serves event goals and
  the Events tab. There is no JSONB index: prop filters always arrive with a site and a range,
  and the range scan is the cheap path at this size.
- `props` is JSONB because its keys are unknown. Vitals are not: the module reports a fixed
  set (§8.4), so they are typed columns, a NULL excludes the row from `percentile_cont`, and
  nothing casts client text in an aggregate. `revenue` is a typed column for the same reason:
  ingest parses the `revenue` prop with a strict numeric check and stores it, or leaves NULL.
- `bigint` holds the 64-bit hashes by signed reinterpretation, a bijection, so grouping and
  counting are exact. `text` with caps enforced at ingest, not `varchar(n)`, because overflow
  must truncate, not raise, on a fire-and-forget beacon.
- `ts` is never rewritten (§7.2) and is the analytics clock; `received_at` is the realtime
  clock, because `ts` is client wall-clock time. `(ts, seq, pageview_id)` is the total order
  inside a session even across a duplicated tab.
- `suspect` keeps rows that failed a soft check filterable rather than invisible.
- The foreign key is right; the cascade is never triggered from a request (§14).
- No partitions, no rollups. Retention is one nightly delete in the housekeeping function.

### 4.1 Event types

| event | required beyond the shared context | generated by |
|---|---|---|
| pageview | session_id, pageview_id (tracker); visitor_id (ingest) | both |
| engagement | pageview_id, engaged_ms, scroll_depth | tracker |
| custom | name, props, revenue if present; pageview_id of the page it fired on | tracker |
| vitals | pageview_id, the vitals columns | tracker's vitals module |
| identify | user_hash (ingest, from `uid`) | both |

### 4.2 Supporting tables, all in `analytics`

None of these has a PostgREST consumer, so none is in `public`, none needs RLS, and the default
privileges that still grant `authenticated` on new public tables (`supabase/schema.sql`) cannot
reach them.

```sql
create table analytics.site_hostnames (
  site_id   bigint not null references public.websites(id) on delete cascade,
  hostname  text   not null,                 -- lowercase, no scheme, no port
  primary key (site_id, hostname),
  unique (hostname)
);
-- seeded from websites.url, normalised to a bare hostname, in the same migration

create table analytics.site_settings (
  site_id         bigint primary key references public.websites(id) on delete cascade,
  timezone        text    not null default 'UTC',
  store_titles    boolean not null default false,
  store_user_ids  boolean not null default false,
  excluded_ips    cidr[]  not null default '{}',
  excluded_paths  text[]  not null default '{}'           -- glob patterns, e.g. '/admin/*'
);
-- no trigger: ingest and the query layer read settings with a default row when none exists,
-- and the settings UI (Phase 1) upserts

create table analytics.visitor_salts (day date primary key, salt bytea not null, created_at timestamptz not null default now());
-- salt bytes are generated in application code (Node crypto), so no pgcrypto dependency

create table analytics.identified_users (   -- raw ids, only for sites with store_user_ids
  site_id    bigint not null references public.websites(id) on delete cascade,
  user_hash  bigint not null,
  user_id    text   not null,
  last_seen  timestamptz not null default now(),
  primary key (site_id, user_hash)
);

create table analytics.ingest_log (         -- rejects and failures, for "why is my site empty"
  ts        timestamptz not null default now(),
  hostname  text        not null,
  site_id   bigint,                          -- null when unregistered
  stage     text        not null,            -- origin_missing | size | unregistered | bot | schema | time_bound | site_mismatch | excluded_ip | excluded_path | insert_failed
  detail    text        not null default ''
);
create index ingest_log_hostname_ts on analytics.ingest_log (hostname, ts);

-- One housekeeping function, one guarded cron job. Re-runnable, and the container in CI applies
-- the same file (the cron branch is skipped when pg_cron is absent).
create or replace function analytics.housekeeping() returns void language sql as $$
  delete from analytics.events           where ts < now() - interval '24 months';
  delete from analytics.visitor_salts    where day < current_date - 2;
  delete from analytics.identified_users where last_seen < now() - interval '90 days';
  delete from analytics.ingest_log       where ts < now() - interval '30 days';
  delete from analytics.events e using public.websites w
    where e.site_id = w.id and w.deleted_at is not null and e.id in
      (select id from analytics.events where site_id = w.id limit 50000);
  delete from public.websites w where w.deleted_at is not null
    and not exists (select 1 from analytics.events where site_id = w.id);
$$;
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('lynq_housekeeping') from cron.job where jobname = 'lynq_housekeeping';
    perform cron.schedule('lynq_housekeeping', '20 0 * * *', 'select analytics.housekeeping()');
  end if;
end $$;
```

`pg_cron` is enabled in the same migration (available on the project, not yet installed).
`websites` gains a `deleted_at timestamptz` column: site deletion is a soft delete from the UI
and the housekeeping job removes events in bounded batches, then the row (§14).

## 5. Identity

### 5.1 Anonymous visitors (default, D-003)

```
visitor_id = int64 from the first 8 bytes, little-endian, of SHA-256( salt(utc_day(ts)) || site_id_le64 || client_ip || user_agent )
```

`lib/ingest/hash.ts` implements it for ingest and the backfill, with a committed test vector,
so the two cannot disagree on byte order or signedness.

- `salt(day)` is 32 random bytes per UTC day, generated in Node and stored in `visitor_salts`
  with `insert ... on conflict do nothing` then read, so concurrent cold starts agree. The
  function caches salts by day and never caches "today" as a single value, so an instance
  living across midnight does not double-count the boundary.
- Client IP: `x-vercel-forwarded-for`, then `x-real-ip`. `x-forwarded-for` is never parsed; its
  first entry is client-controlled. This replaces the TICKET-003 helper.
- The hash protects against enumeration, not against a targeted check by someone holding the
  day's salt, which is deleted after two days. The privacy page says exactly that.
- A visitor is a new visitor every UTC day. Every metric counting visitors over more than a
  day, including the Visitors headline and goal conversion rate, counts visitor-days for
  anonymous traffic. `identify()` lifts it. Accepted in D-004.
- Nothing persistent is written to the browser; the browser state is the per-tab session
  record (§6.1) and, on request, the opt-out flag.

### 5.2 Identified users

`lynq.identify(userId)` sends an `identify` event and the tracker keeps `uid` in the session
record. Ingest sets `user_hash = HMAC-SHA-256(LYNQ_IDENTITY_SECRET, site_id_le64 || uid)`,
truncated the same way, and `visitor_id = user_hash`. The secret is one application value in
Vercel env and `.env`, not a column: the same isolation between sites, no per-site default, no
trigger, and a database dump no longer contains the value that de-anonymises `user_hash`. It is
not rotatable without re-identifying every user; the docs say so.

The raw `uid` never enters `events`; with `store_user_ids` on it is upserted into
`identified_users`, expired after 90 days unseen. GPC suppresses `identify()` unconditionally;
`optOut()` and, with `data-respect-dnt`, DNT suppress everything. Rows before the identify call
keep their daily hash; stitching is a Phase 3 query concern.

`user_hash = 0` is the anonymous sentinel. The query layer adds `user_hash <> 0` to every
identity-keyed query itself (§9.3), so retention, the people explorer and attribution cannot
collapse every anonymous row into one "user" who is present every day.

### 5.3 Legacy data

Backfilled rows use `hash(backfill_salt || utc_day || site_id || legacy client_id)` through the
same code, so the table has one definition of "visitor" on both sides of the cutover and no
permanent identifier enters it. The backfill salt is generated once and recorded in the ticket.

## 6. Sessions

A session is `(site_id, visitor_id, session_id)`, `session_id` from the tracker. Every query
that selects sessions keys on the pair `(visitor_id, session_id)`, never `session_id` alone.

### 6.1 The per-tab session record

One JSON record in `sessionStorage`, keyed by the `data-site` value:

```
{ sid, started, lastActivity, seq, ref, url, uid? }
```

`sid` is a random 64-bit id, replaced after 30 minutes idle or 6 hours total. `seq` is the tab's
monotonic event counter. `ref` and `url` are `document.referrer` and `location.href` when the
session was minted (§7.4). Every storage access is in try/catch; the fallback is an in-memory
record for that page load. A batch queued when the session expires is flushed under the old
`sid` first. A tab opened with an opener (`window.open`, or a link with `rel="opener"`)
inherits the record through the browser's `sessionStorage` clone and continues the session. A
tab opened without one starts a new session: that includes `target="_blank"` links, which
browsers have treated as `noopener` by default since 2021, and middle-clicks. Verified in the
Playwright suite (TICKET-018); a known bias in the session count, accepted for a portfolio
project. No cross-tab messaging is used.

Known cases: duplicated tabs share a session and interleave, ordered by `(ts, seq,
pageview_id)`; a session across UTC midnight splits because `visitor_id` rotates; people
behind one IP share a `visitor_id` but not a `session_id`, which is why the client id is the
definition and timestamp gaps are not. The server does not validate `session_id` beyond shape.
Query-time repair splits one `session_id` on a gap over 30 minutes or a span over 6 hours and
never merges across ids.

### 6.2 Engagement

The tracker accumulates visible milliseconds and max scroll depth per pageview, reset on each
navigation and bfcache restore, and reports the delta as an `engagement` row: piggybacked on
any outgoing batch, standalone on `visibilitychange` to hidden and on `pagehide`, and as a
five-minute safety flush. No periodic timer. Per-pageview engaged time is `sum(engaged_ms)`
grouped by `pageview_id`.

### 6.3 Definitions, in one place

`lib/query/sessions.ts` owns these as one materialised session CTE (§9.3) that every session
metric reads from:

```sql
with sess as materialized (
  select visitor_id, session_id,
         min(ts) as started,
         sum(engaged_ms) as duration_ms,                                  -- Duration
         max(ts) - min(ts) as time_on_site,                               -- a separate, non-default metric
         count(*) filter (where event = 'pageview') as pageviews,
         count(*) filter (where event = 'custom') as customs,
         (array_agg(path order by ts, seq, pageview_id) filter (where event = 'pageview'))[1] as entry_path,
         (array_agg(path order by ts desc, seq desc, pageview_id desc) filter (where event = 'pageview'))[1] as exit_path
  from analytics.events
  where site_id = $1 and ts >= $2 and ts < $3 and not suspect
  group by 1, 2
)
```

Bounce is `pageviews = 1 and duration_ms < 10000 and customs = 0`. Session metrics are
bucketed by `started`. The ordered path list for the paths feature is not an array at all:
`lead(path) over (partition by visitor_id, session_id order by ts, seq, pageview_id)` on the
pageview rows, with loop collapsing as a prior CTE that drops rows where `path` equals the
`lag(path)` in the same window (§16).

## 7. Ingest API v2

`POST /api/collect`, Node runtime, `dynamic = "force-dynamic"`, `maxDuration = 5`.

### 7.1 Request

Every batch carries the page it belongs to and the session context. An event is stamped with
the current `page` and `pid` at enqueue time; a navigation flushes the pending batch before the
new `pid` is minted, so a batch never spans two pages.

```json
{
  "v": 2,
  "site": "lynq.byharsh.com",
  "sid": "8f3c...", "pid": "a91e...", "uid": "user_123",
  "page":    { "url": "https://lynq.byharsh.com/pricing?utm_source=x", "title": "Pricing" },
  "session": { "ref": "https://www.google.com/", "url": "https://lynq.byharsh.com/?utm_source=x" },
  "ctx":     { "sw": 1440, "sh": 900, "lang": "en-GB" },
  "events": [
    { "t": "pageview",   "ts": 1788612834219, "seq": 41 },
    { "t": "custom",     "ts": 1788612900000, "seq": 42, "name": "signup", "props": { "plan": "pro", "revenue": "4900" } },
    { "t": "engagement", "ts": 1788612900000, "seq": 43, "ms": 65780, "scroll": 72 },
    { "t": "vitals",     "ts": 1788612901000, "seq": 44, "m": { "lcp": 1834, "cls": 0.02, "inp": 120 }, "targets": { "lcp": "img.hero" } }
  ]
}
```

Transport contract: body is JSON sent as `text/plain;charset=UTF-8` via `sendBeacon(url, new
Blob([json], { type: "text/plain;charset=UTF-8" }))` or `fetch(url, { method: "POST", body,
keepalive: true })` with no `Content-Type` header, so no preflight. Responses carry
`Access-Control-Allow-Origin: <Origin>` and `Vary: Origin` on 202 and 400; OPTIONS returns 204.
Client batches are capped at 8 KB and 20 events and split beyond that; `sendBeacon`'s `false`
return falls back to `fetch(keepalive)`. The tracker batches over 1 s and flushes on `pagehide`.

### 7.2 Pipeline, in order

1. Gates before parsing: missing `Origin` → 400 (`origin_missing`); `Content-Length` over
   32 KB → 400 (`size`).
2. Resolve the `Origin` hostname to a site and its settings (§7.3). Unregistered → 202,
   `unregistered` logged, nothing written.
3. Excluded IP (`excluded_ips`) → 202, `excluded_ip` logged. The raw IP exists only here.
4. Bot (`isbot` on `User-Agent`) → 202, `bot` logged.
5. zod schema → 400 (`schema`) on shape errors: `sid`/`pid` 16 hex chars, `events` non-empty,
   every event has `t`, `ts`, `seq`; `page.url` parses and its hostname is one of the site's;
   vitals values are numbers (`z.record(z.number())`, non-numeric members dropped). Unknown
   fields are dropped.
6. Soft checks set `suspect` on the batch and log a row: body `site` differs from the resolved
   hostname (`site_mismatch`); `seq` not strictly increasing.
7. Time bounds per event: `ts` outside `[received_at - 24 h, received_at + 5 min]` → dropped,
   `time_bound` logged. Accepted events keep `ts` exactly as sent; nothing is rewritten.
8. Excluded path (`excluded_paths` glob) → event dropped, `excluded_path` logged.
9. Enrich per batch: geo from platform headers (TICKET-003), `ua-parser-js` for browser,
   major, version, OS, version, device; `sw`, `sh`, `lang` from `ctx`.
10. Parse `page.url` into hostname, path (≤ 2048), allow-listed query; `title` only with
    `store_titles` (≤ 512); `session.ref` and `session.url` into referrer, `referrer_url`
    (≤ 2048), source, channel, `utm_*` (§7.5). Strip C0/C1 control characters. A custom
    event's `revenue` prop is parsed with `^-?[0-9]+(\.[0-9]+)?$` into the `revenue` column or
    left NULL.
11. `visitor_id` per batch; `user_hash` when `uid` is present; `identified_users` upsert when
    `store_user_ids` is on.
12. One multi-row insert through `postgres.js` inside `sql.begin` with
    `set local statement_timeout = 2000`. On error or timeout: a structured stdout line and,
    if the database is reachable, an `insert_failed` row in `ingest_log`; still 202.
13. Respond 202, empty body, CORS headers.

Everything after the gates returns 202: the tracker never retries, so a 5xx would only lose
the same data with extra load.

### 7.3 Site resolution, settings and hostnames

Exact match on a lowercase hostname, after stripping one leading `www.`, against
`site_hostnames`. `websites.url` is normalised to a bare hostname in the migration and seeded
as the first hostname; extra hostnames are rows the owner adds (Phase 2 UI). No parent-domain
matching, so `github.io` or `corp.com` cannot swallow siblings. `updateWebsiteOne` in
`lib/actions.ts` currently accepts any column name; it is narrowed to `name` and
`is_first_visit`, and a URL change (Phase 2 UI) writes `site_hostnames` in the same statement.
The lookup returns the site id and its settings row (defaults when none exists) in one query;
hits and misses are cached 60 s per function instance.

Path and query: path stored without the query string; only `utm_*` and `ref` kept in `query`;
fragments dropped. Path segments (`/reset/<token>`) are the customer's responsibility and
`excluded_paths` is the tool. Titles are off by default because search pages and logged-in
apps put user content in them. Glob patterns (`excluded_paths`, and pageview goals in Phase 2)
compile through one translator to `LIKE` with `_` and `%` escaped; user-authored regular
expressions are never run against the table.

### 7.4 Referrer

A session property: captured when the session is minted, kept in the session record, sent on
every batch, classified once per batch, copied to every row. A referrer on one of the site's
own hostnames is internal and yields `''`. This differs from v1's per-pageview referrer; the
diff compares at session grain.

### 7.5 Source and channel classification

`lib/ingest/referrers.ts` maps referrer hostnames to a source and channel, seeded from
Plausible's public referrer map (MIT). UTM overrides: `utm_medium` in (cpc, ppc, paid) → Paid;
email → Email; social → Social; otherwise Referral with `source = utm_source`. Empty referrer
and no UTM → Direct. Unmatched hostname → Referral with `source = hostname`.

### 7.6 Identify and custom events

`uid` ≤ 128 chars; raw storage rules in §5.2. Custom events: `name` ≤ 64, ≤ 20 props, keys
≤ 32, values stringified ≤ 256. A `revenue` prop is minor units as a numeric string and is
also stored in the typed column; a `currency` prop is the Phase 2 convention. Oversize is
truncated, not rejected. The dashboard renders every event-derived string as text.

### 7.7 Abuse, briefly

The site comes from `Origin`, which a browser page cannot forge for another site; a script can.
Gates, time bounds, the trusted IP, `suspect` marking and `ingest_log` bound the damage and make
an injection visible. A Vercel Firewall rate-limit rule on `/api/collect` is a dashboard
setting worth flipping on; nothing in code depends on it.

### 7.8 Diagnostics

`ingest_log` answers "why is my site empty", and the one person who will ask owns the database.
There is no debug response from the endpoint.

### 7.9 v1 adapter

`/api/lynq` keeps its current behaviour and, after its writes to the old tables, maps the event
to `events` rows with `ingest_version = 1`: session-start and page-view → pageview; session-end
→ one engagement row (`engaged_ms = sessionDuration`) and one vitals row, attached to the
session's most recent pageview (tracked per instance, else a `pageview_id` hashed from the
session id); custom events → custom rows with props from the property list. `session_id` is the
legacy text id hashed; `seq` a per-instance counter; source and channel classified from the
session's first pageview referrer. The fire-and-forget Supabase writes are wrapped in
`waitUntil()` from `@vercel/functions`. `visitor_id` uses the legacy scheme (§5.3). The adapter
is removed at v1 sunset (D-005).

### 7.10 Proxy

`proxy.ts` matches every non-static path and redirects anonymous requests to `/login` after a
Supabase Auth call. Its matcher gains `api/collect`, `api/lynq` and `js/` in the negative
lookahead. A CI assertion checks `GET /js/lynq.js` and `POST /api/collect` return 2xx with no
`Set-Cookie`, no `Location`, and the expected `Cache-Control` on the script.

## 8. Tracker v2

### 8.1 Shape

- `packages/tracker/src`, TypeScript, esbuild. Core (budget 3 KB gzipped): session record and
  fallbacks, SPA navigation, batching and the transport contract, engagement and scroll, GPC/
  DNT/optOut, localhost check, queue stub, `track()`, `identify()`. Extras chunk on
  `data-outbound` / `data-auto-events`: outbound and download clicks, declarative
  `data-lynq-event` elements. Vitals chunk on `data-vitals`: `web-vitals/attribution` plus
  navigation timing (§8.4), about 4.5 KB.
- Served at `/js/lynq.js` from `public/` with `Cache-Control: public, max-age=300,
  stale-while-revalidate=86400` via `headers()` in `next.config.mjs`; the immutable
  `/js/lynq.<hash>.js` alongside for pinned installs with an `integrity` attribute. No redirects.
- Snippet: `<script defer src="https://lynq.byharsh.com/js/lynq.js" data-site="example.com"></script>`.
  Attributes are the whole configuration surface: `data-site`, `data-vitals`, `data-outbound`,
  `data-auto-events`, `data-allow-localhost`, `data-respect-dnt`. Server-enforced settings live
  in `site_settings`; the tracker is one static file with no config fetch.
- `lynq-js` is archived at its last v1 commit so the jsDelivr URL stays frozen on v1.

### 8.2 Behaviour

| Concern | v2 |
|---|---|
| Visitor id | none; server hash |
| Session | per-tab record (§6.1), 30 min idle / 6 h max, try/catch fallback, inherited by tabs opened from links |
| SPA navigation | patched pushState/replaceState + popstate + hashchange; pageview only when normalised `pathname + allow-listed query` changes; pending batch flushed before the new `pid`; accumulators reset |
| Back/forward cache | `pageshow` with `persisted`: re-check expiry, new `pid`, emit pageview, reset accumulators |
| Engagement | deltas on hidden, pagehide, piggybacked, 5-minute safety flush (§6.2) |
| Scroll depth | max % per pageview |
| Outbound, downloads, declarative events | extras chunk |
| Vitals | vitals chunk (§8.4) |
| Transport | §7.1 |
| Global Privacy Control | honoured unconditionally: forces anonymous mode, pageviews continue |
| Do Not Track | honoured only with `data-respect-dnt` |
| Opt-out | `lynq.optOut()` writes `localStorage['lynq_optout'] = '1'`; `optIn()` removes it |
| Localhost | ignored unless `data-allow-localhost` |

Public API: `lynq.track(name, props)`, `lynq.identify(uid)`, `lynq.optOut()`, `lynq.optIn()`.

### 8.3 Tests

Payload types generated from the server's zod schema (`zod-to-ts`). Playwright against a
fixture page and a local recorder: SPA navigation yields a pageview in a new batch with the
new page context; same-URL `replaceState` and hash-only changes yield nothing; hiding the tab
yields an engagement row with the right `pid`; a bfcache restore yields a pageview with a new
`pid`; a `data-lynq-event` click yields a custom event; a tab opened with `rel="opener"` continues the session and a
`target="_blank"` tab starts a new one; the batch flushes on pagehide and an oversized queue splits; a project with site data
blocked still records pageviews; and an invariant test over a random walk asserting every
captured batch has non-empty `page.url` and `session.ref`, a `pid` consistent with its page, a
distinct `pid` across each navigation, and strictly increasing `seq`.

### 8.4 Vitals module

Today's Performance tab shows thirteen numbers. `web-vitals` produces five (LCP, CLS, INP, FCP,
TTFB). The module also reads the navigation entry for `dcl`, `load` and `tti` (`domInteractive`,
what v1 called TTI), sums `longtask` entries over 50 ms for `tbt`, and counts resource entries.
Each goes into its typed column per page load. Dropped: the two JS heap sizes (Chrome-only,
non-standard) and `interactionCount` (INP supersedes it). The JS heap card is retired in
Phase 1 (D-004).

## 9. Query layer

`lib/query/` is the only place with SQL against `analytics`, through one `postgres.js` instance
(§14), parameters only, never interpolation.

```ts
type QueryContext = {
  siteId: number;              // from authorize(), never from the caller
  range: { from: Date; toExclusive: Date };   // UTC; half-open, always
  compare?: { from: Date; toExclusive: Date };
  timezone: string;            // site_settings.timezone
  filters: Filter[];           // { dimension, op: 'is' | 'is_not' | 'contains', values: string[] }
  includeSuspect?: boolean;    // default false
};
```

### 9.1 Ranges and granularity

Rolling (`last_24h`, `last_7d`, `last_30d`, `last_90d`, `last_12mo`) or calendar (`today`,
`yesterday`, `this_week`, `this_month`, `custom`). Calendar ranges are computed in the site
timezone and converted to UTC. Every range is half-open: `ts >= from and ts < toExclusive`.
`ranges.ts` never returns an inclusive end and `between` does not appear in the query layer,
because an inclusive boundary instant lands in both a period and its comparison. Compare is
the same length immediately before, or the same calendar period a year earlier. Granularity
`hour`, `day`, `week` (Monday), `month`; the bucket is
`date_trunc($g, ts at time zone $tz) at time zone $tz`, the round trip back so the label is a
`timestamptz` and charts are not silently shifted. Today's dashboard buckets in the viewer's
browser timezone; after cutover it buckets in the site's (D-004).

### 9.2 Primitives

- `timeseries(ctx, metric, granularity)`: pageviews, visitors, sessions, bounce rate, engaged
  time, pages per session, custom event count, goal count (Phase 2 supplies goals).
- `breakdown(ctx, dimension, metric, { limit, offset })`: path, entry path, exit path,
  referrer, source, channel, utm_*, country, region, city, device, browser, browser major, os,
  os version, screen size, screen bucket, language, custom event name, custom prop key, custom
  prop value for a key. Sorted by the metric, with a total for "N more". Entry and exit path
  are session dimensions and only take session metrics; the compiler rejects other pairings.
- `summary(ctx)`: every scalar metric for `range` and `compare` in one round trip.
- `rows(ctx, kind, { limit, cursor })`: recent custom events with session context (today's
  Events tab), a session's ordered events, and the sessions matching a `sessionWhere` (funnel
  drop-off drill-down). Under the daily hash a "person" is a visitor-day; the drill-down shows
  sessions and their pages, and users only with `identify()`.

### 9.3 Filters

`values` is plural: OR within a dimension, AND across dimensions, as today's click-to-filter.
The compiler emits `rowWhere` for row dimensions and, for session predicates (entry path, exit
path, bounced, converted, duration over N), a `having` clause on the session CTE from §6.3;
metrics then join `events` to `sess using (visitor_id, session_id)`. One scan builds the
session set and the session-start bucket falls out of it. The CTE is `materialized`, because
Postgres 12+ would otherwise inline it and scan twice.

Prop filters are `props @> jsonb_build_object($key, $value)` for equality and `props ? $key`
for existence, never `->>` in a `where` clause. Identity-keyed queries (retention, people,
attribution by user) always carry `user_hash <> 0`, emitted by the compiler. Every query adds
`site_id = $1` and, by default, `not suspect`. Dimension and metric names are validated against
an allow-list; values are parameters. Saved segments (Phase 1) are a `Filter[]` in a Postgres
table; the compiler cannot tell where a filter came from.

### 9.4 Authorization seam

Nothing calls a primitive without a context, and a context comes only from
`authorize(principal, siteRef)` in `lib/query/authorize.ts`. In Phase 0 the only principal is
the Supabase session user and the check is `authorizeWebsite` (which will return the site id it
already selects). API keys, share tokens and team membership are each a Postgres table and a
branch in `authorize()`, added in the phase that ships the feature; `lib/query` does not change.

## 10. Backfill

`scripts/backfill-events.mjs --site <url> --until <ISO> [--dry-run]`, run once with the pooler
URL. `--until` is the v1 adapter's deploy time; the export reads `created_at < until` and the
wipe is `delete from analytics.events where site_id = $1 and ingest_version = 0 and ts < $2`,
so re-runs are safe. Inserts in batches of 5,000 with progress on stdout.

| Old table | `events` rows |
|---|---|
| `page_views` joined to `sessions` | one `pageview` per row; geo, device, browser, os from the session; referrer classified with the ingest code (`'Unknown'`, the column default, classifies as Direct); `visitor_id` per §5.3; `session_id` and `pageview_id` hashed from the legacy ids; `seq` from row order within the session; an orphan page view (no session row) gets a `visitor_id` hashed from its session id and `'Unknown'` device fields, as today's dashboard renders it |
| `sessions.session_duration` | one `engagement` row per session, attached to its last pageview |
| `vitals` joined to `sessions` | one `vitals` row per vitals row into the typed columns, attached to the last pageview; heap sizes and interaction count are not carried |
| `custom_events` grouped by `event_id` | one `custom` row with `props`, attached to the pageview closest before it |
| `visitors` | not needed |

Approximations, stated: legacy `device` stays as stored (no tablets); legacy country names map
to ISO codes with `i18n-iso-countries` and unmapped names are printed, not silently blanked;
legacy bounce and duration definitions are not reproduced. The cutover date goes into the ticket
and later into the annotations table.

## 11. Transition and cutover

1. The v1 adapter and ingest v2 both live; existing installs feed `ingest_version = 1` rows;
   the backfill covers everything before `--until`.
2. Lynq's own site runs both snippets for a day so the v2 path sees real traffic.
3. `scripts/diff-events.mjs` compares, for one site and one day, pageviews and top paths
   between the old tables (read directly, no row cap; visitors as `count(distinct client_id)`
   from sessions) and `events` for `ingest_version = 1`, and between `ingest_version = 1` and
   `2` for Lynq's site. Pageviews and paths should agree within a percent with each
   discrepancy explained; visitors, bounce, duration and referrers differ by definition and are
   reported, not gated. `count(*) filter (where path = '')` must be zero on v2 rows.
4. Phase 1 switches the dashboard to `lib/query`. After Phase 1 ships, the v1 route stops
   writing the old tables, they are exported and dropped, and the adapter stays until v1 sunset
   (D-005). The landing-page copy changes then.

## 12. Repository layout

```
packages/tracker/            source, tests, esbuild config; output copied to public/js/
lib/ingest/                  pipeline, hash.ts, referrers.ts, ua parsing, time bounds, site resolution, glob.ts (server only)
lib/query/                   authorize.ts, ranges.ts, sessions.ts, filters.ts, primitives
lib/db.ts                    the one postgres.js instance (§14)
scripts/                     backfill-events, diff-events
app/api/collect/route.ts     v2 endpoint (+ OPTIONS)
app/api/lynq/route.ts        v1 endpoint + adapter
proxy.ts                     matcher excludes api/collect, api/lynq, js/
next.config.mjs              headers() for /js/*
supabase/migrations/         analytics schema, events, supporting tables, housekeeping, pg_cron, websites.deleted_at, url normalisation
```

npm workspaces for the tracker package; the Next app stays at the root. Migrations stay in
`supabase/migrations` and apply with `supabase db push`, as today; every migration is
re-runnable so the CI container and a shadow database can apply the same files.

## 13. Testing and CI

- Unit (vitest, no services): `hash.ts` vector, salt cache across midnight, time bounds, client
  IP, hostname normalisation, exclusions, glob-to-LIKE translation, url/referrer/utm parsing,
  classification, caps and control-character stripping, the revenue parser, the range resolver
  in three timezones with half-open bounds, the filter compiler including session predicates,
  prop operators, `user_hash <> 0` and the AND/OR rule, the zod schema and the reject/suspect
  matrix, the adapter and backfill mappings and the unmapped-country report.
- Integration (vitest + a `postgres:15` service container, migrations applied from empty, the
  cron branch skipped by its own guard): the fixture batch inserted and every primitive returns
  the expected numbers; session repair splits on a 31-minute gap and never merges ids; bounce
  and duration match §6.3; `suspect` excluded by default; p75 ignores NULLs; a boundary event
  is counted once across a range and its comparison; retention excludes anonymous rows;
  `housekeeping()` deletes what it should and nothing else.
- Tracker (Playwright): §8.3, plus the proxy and cache-header assertion.
- Scripts: `npm run verify` stays lint, typecheck, ticket check and unit tests, so a commit needs
  neither Docker nor a browser; `test:integration` and `test:e2e` are separate and are close
  evidence for tickets touching `lib/ingest`, `lib/query` or `packages/tracker` (CLAUDE.md rule
  5, amended in the first ticket).
- CI: `verify` as today plus unit tests; a second `test` job with the Postgres container and
  Playwright, cached.

## 14. Operations

- One Supabase project, one database role for analytics: the pooler's `service_role`
  connection, used only from server code. No `create role` migration; timeouts are per
  statement (`set local statement_timeout` inside `sql.begin`: 2 s on the ingest path, 30 s
  on reads).
- `lib/db.ts`: `postgres(process.env.LYNQ_DB_POOLER_URL, { prepare: false, max: 4,
  idle_timeout: 20, connect_timeout: 10 })`, one module-scope instance. `prepare: false`
  because the pooler runs in transaction mode; `max: 4` (raised from 1 in TICKET-023) because
  the dashboard fans out ~16 short queries per load and one connection serialised them into a
  six-second wait, while the default of ten per warm Vercel instance is more than it needs. The module asserts at startup that
  the URL's port is 6543 or its host contains `pooler.supabase.com`, so a direct-connection URL
  fails fast instead of exhausting the server.
- `LYNQ_IDENTITY_SECRET` (§5.2) and `LYNQ_DB_POOLER_URL` are in Vercel env and `.env`.
- Housekeeping is one `pg_cron` job calling `analytics.housekeeping()` nightly (§4.2):
  retention, salts, identified users, ingest log, and soft-deleted sites in bounded batches.
- Site deletion from the UI sets `websites.deleted_at`; the housekeeping job removes the
  site's events 50,000 rows a night and then the row. The cascade on the foreign key remains
  for correctness but is never invoked from a request, which would otherwise hold a lock past
  any timeout. A user-level deletion request deletes by `user_hash` in `events` and by key in
  `identified_users`. Anonymous rows have no key to delete by.
- Backups: Supabase's daily backups cover everything.
- If a query ever exceeds a second, the first lever is a nightly summary table; the second is a
  different store behind `lib/query`. Neither is planned.

## 15. Risks, and what the owner has accepted (D-004, D-005)

| Risk | Handling |
|---|---|
| Cold starts add 200 to 500 ms to the first beacon | The tracker never waits on the response |
| Postgres slow or unreachable | 2 s timeout, 202 to the client, stdout line; data for that window is lost, the accepted policy for a beacon endpoint |
| Daily visitor hash bounds retention, funnels, attribution and multi-day conversion rates for anonymous traffic | D-003; `identify()` lifts it; §16 says so per feature |
| A per-tab session record in sessionStorage under strict ePrivacy readings | Non-persistent, random id plus entry referrer, same category as a CSRF token; the landing page claim is worded to match |
| Backfill changes visitor, bounce, duration and referrer definitions | Expected, listed in the diff, annotated at the cutover date |
| Trusted-IP change alters `visitor_id` for anyone behind a proxy Vercel already handled | No v2 rows exist yet |
| `LYNQ_IDENTITY_SECRET` cannot be rotated without re-identifying users | Stated; it lives in env, not in the database dump |
| The one connection per instance | Enough for a beacon endpoint and a dashboard at a few sites; `max` is one number to change |

Visible on cutover day, accepted in D-004: Visitors becomes visitor-days over multi-day ranges
and steps down; average time and bounce rate become engagement-based and single-pageview-based
and read lower; referrers become per-session; time series bucket in the site timezone; the
Performance tab loses the JS heap card. Defaults, accepted in D-005: retention 24 months, DNT
off with GPC always on, `store_user_ids` off, `store_titles` off, v1 sunset after 30 quiet days.

## 16. Does the schema cover the roadmap

| Feature | Query shape on `events` | Needs identify()? |
|---|---|---|
| Realtime | `where site_id = $1 and received_at >= now() - interval '5 minutes'` (server clock, not `ts`); `count(distinct visitor_id)`; current page per session by `distinct on (visitor_id, session_id) ... order by visitor_id, session_id, ts desc, seq desc` | no |
| Custom ranges, compare | `summary` with `compare`; `timeseries` with `date_trunc` in the site timezone, half-open bounds | no |
| Entry / exit pages | the session CTE (§6.3); as a filter via its `having` | no |
| UTM, channels, sources, referrers, geo, devices, versions, screen sizes, languages | `group by` on the column, present on every row | no |
| Saved segments, URL filters | `Filter[]` serialised (§9.3) | no |
| Goals | pageview goal `count(*) filter (where path like $glob_as_like)`; event goal `where event = 'custom' and name = $name` (partial index); conversion rate = distinct visitors with goal / distinct visitors | rate within a day: no; multi-day: yes |
| Revenue per goal | `sum(revenue)` on the typed column | no |
| Event property breakdown | `group by props ->> $key`; key list via `jsonb_object_keys`; filters with `@>` and `?` | no |
| Events explorer rows | `rows(ctx, 'events')` | no |
| Performance p75 per page | `percentile_cont(0.75) within group (order by lcp)` grouped by path, NULLs excluded by the aggregate; target by `mode() within group (order by lcp_target)` | no |
| Public dashboards, REST API, team roles | `authorize()` seam plus a Postgres table each | no |
| Email digests, alerts, per-site retention | Vercel Cron calling the primitives (Phase 2) | no |
| Excluded IPs and paths | ingest (§7.2), because the raw IP exists only there | no |
| Funnels | one CTE per step over the window: `min(ts) filter (where <step>)` per `visitor_id`, each step constrained to `ts > previous_step_ts`, then count visitors reaching each level; drill-down via `rows(ctx, 'sessions')` | within a day: no; multi-day, and "who" as people: yes |
| Paths | `lead(path) over (partition by visitor_id, session_id order by ts, seq, pageview_id)` on pageview rows, loop collapse by dropping rows equal to `lag(path)` in a prior CTE, exclusions as a filter, then `group by path, next_path` | no |
| Retention | first-seen day per `user_hash` over all history (`min(ts)` with `user_hash <> 0`, a full scan that is fine here), then `count(distinct user_hash) filter (where seen on day N)` per cohort | yes |
| Sessions / people explorer | `rows(ctx, 'session')` ordered by `(ts, seq, pageview_id)`; per `user_hash <> 0` across days | sessions: no; people: yes |
| Attribution | source is a session property, so first-touch is the session's `source` for the first session containing the goal per visitor; `distinct on (visitor_id) ... order by visitor_id, started` over the session CTE; last-touch `started desc` | within a day: no; multi-day: yes |
| Annotations, deploy markers | Postgres table (Phase 2), joined by date in the UI | no |
| Errors | Phase 3: `alter table add column payload text`, `event = 'error'`, fingerprint in `props` | no |
| Explain a change by source, page, country, device | one query with `grouping sets ((source), (path), (country), (device))` over both windows, sorted by absolute delta | no |
| Stripe revenue attribution | join on `user_hash` from `identify()`; no key exists for anonymous traffic, by design | yes |
| Heatmaps, replay | out of scope; a separate click-level store | — |

Nothing needs a schema change. Funnels, paths and retention are hand-written SQL rather than
built-ins; at a few sites that is a difference in lines of SQL, not in capability.

## 17. Implementation tickets

1. **Schema and plumbing.** `analytics` schema with grants, `events` and its three indexes, the
   five supporting tables, `housekeeping()` with the guarded `pg_cron` job, `websites.deleted_at`,
   `lib/db.ts`; CI `test` job with a Postgres container; vitest added and `verify` amended;
   CLAUDE.md rule 5 amended.
2. **Identity and site registry.** `hash.ts` with vector and the HMAC user hash, salt cache,
   trusted client IP (replacing the TICKET-003 helper), `site_hostnames` seeding and url
   normalisation, `updateWebsiteOne` allow-list, `deleteWebsite` as a soft delete,
   `authorizeWebsite` returning the site id.
3. **Ingest v2 endpoint.** Proxy matcher, gates, resolution and settings cache with defaults,
   exclusions, zod schema and the reject/suspect matrix, time bounds, enrichment, caps, glob
   translator, classification, revenue parsing, insert with `set local` timeout, `ingest_log`,
   CORS and OPTIONS; tests.
4. **v1 adapter dual-write.** Mapping with `pageview_id` and `seq` tracking, `waitUntil()`;
   record the deploy time as `--until`.
5. **Query foundations.** `authorize.ts`, `ranges.ts` (half-open, timezone round trip),
   `sessions.ts` (the materialised CTE), `filters.ts` (row and session predicates, prop
   operators, `user_hash <> 0`, AND/OR), the four primitives; integration tests including the
   boundary and retention cases.
6. **Backfill.** Script with `--until` and `--dry-run`; run after ticket 4 is deployed.
7. **Tracker v2 core.** Session record, `seq`, batching and transport contract, engagement,
   bfcache, navigation de-duplication, consent, attribute surface; first-party serving with
   the hashed twin; Playwright suite with the invariant test; archive lynq-js.
8. **Tracker v2 extras and vitals.**
9. **Transition.** Dual snippet on Lynq's site for a day, `diff-events.mjs`, the cutover note,
   phase close-out.

1 to 5 sequential; 6 after 4 is deployed; 7 and 8 once 3 exists; 9 last.

## Appendix A. Review outcomes

Reviews 1 to 3 (ClickHouse design, v1 to v4): findings preserved in the Postgres design
wherever they concern correctness or privacy: page and session context on every row; time
bounds that never rewrite `ts`; trusted client IP; day-keyed salt cache; client session id as
the single definition with repair only within an id; bounce, duration, entry and exit defined
once; session predicates keyed on the visitor and session pair and session-start bucketing;
backfill `--until`, dry-run and idempotent wipe; day-salted legacy ids; hashed user ids with
raw ids in a side table only; proxy matcher exclusions; Origin-based site resolution with
exact hostname matching; size gate before parsing; `suspect`; CORS and the `text/plain`
contract; batch caps and the `sendBeacon` fallback; engagement without a periodic timer;
`store_titles`, string caps, control-character stripping; per-tab `seq` with `pageview_id`
tie-break; honest browser-storage wording and the opt-out flag; `pageshow`; GPC unconditional;
realistic tracker budgets and navigation de-duplication; direct script serving with SRI; split
CI and unit-only `verify`; the `rows` primitive; the `authorize()` seam; `screen_height`;
excluded IPs and paths at ingest; the vitals module keeping navigation timing; the five visible
cutover changes.

Review 4 (Postgres design, v5), sixteen findings, all addressed in v6: `postgres.js` for both
inserts and reads, since supabase-js cannot reach an unexposed schema (§3, §7.2); supporting
tables moved into `analytics`, out of reach of the default `authenticated` grants (§4.2); no
settings trigger, defaults resolved lazily (§4.2, §7.3); the JSONB index dropped and prop
operators fixed to `@>` and `?` (§4, §9.3); one role with `set local statement_timeout`
instead of two roles (§14); half-open ranges everywhere (§9.1); `user_hash <> 0` emitted by the
compiler and all-history first-seen for cohorts (§5.2, §9.3, §16); `received_at` as the
realtime clock (§4, §16); typed vitals and revenue columns instead of casting client text
(§4, §7.2); the pageview index dropped and the session index shrunk (§4); schema grants added,
`site_secret` replaced by an env HMAC secret, no pgcrypto (§4, §5.2); one re-runnable
housekeeping function and guarded cron job (§4.2); soft-delete for sites with batched cleanup
(§4.2, §14); five query formulations corrected (§6.3, §16); pooler URL naming, `max: 1` and the
startup assertion (§14); `updateWebsiteOne` allow-list (§7.3). Cut on its advice: the `payload`
column (Phase 3 adds it), the `data-debug` response.
