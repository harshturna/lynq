# Phase 0: the data foundation

Status: v4, after three reviews, ready for owner decision · Ticket: TICKET-011 · Decisions inherited: D-001, D-002, D-003

## 1. Purpose and scope

Phase 0 replaces the way Lynq stores and reads analytics data. It ships nothing visible. When it
is done, every event lands in ClickHouse through a validating ingest API, the tracker is rewritten,
historical data is backfilled, and the old path is still running alongside so the numbers can be
diffed before anything is switched over.

In scope:

- ClickHouse event store: schema, identity, sessions, retention.
- Ingest API v2 on the existing Next.js app, with the proxy, CORS and abuse surface that comes
  with a public endpoint, and per-site exclusions (IPs, paths) because the raw IP exists only
  on the ingest path.
- Tracker v2 in this repository, served first-party.
- Backfill of the existing Supabase tables.
- Dual-write from the v1 route so existing installs keep working and can be compared, and a
  dual-run of v1 and v2 trackers on Lynq's own site so the new path gets production traffic.
- Query API foundations: the typed layer Phase 1 screens will call: four primitives
  (timeseries, breakdown, summary, rows), the session definitions, site timezone, and an
  authorization seam that later admits API keys, share links and team membership without
  rewriting the query layer.
- Tests and CI for all of the above.

Out of scope, deliberately: any dashboard change (Phase 1), funnels, paths, retention screens
(Phase 3), application-level rate limiting (a platform firewall rule is used instead, §7.8),
MaxMind geo (platform headers cover Vercel; self-hosting is not a target yet), session replay
and heatmaps (both need a separate click-level store at 10 to 100 times event volume),
autocapture, sampling, annotations (Tier 2; a Postgres table in Phase 2), scheduled jobs
(digests and alerts run on Vercel Cron in Phase 2).

## 2. Constraints

- D-001: this phase comes before the UI overhaul and before new features.
- D-002: ClickHouse holds events; Supabase Postgres holds auth, sites, and product metadata.
- D-003: visitors are identified by a daily-rotating salted hash by default; `lynq.identify()`
  opts a site into stable ids for logged-in users.
- Hosting stays Vercel for the app and Supabase for Postgres. ClickHouse is a new managed
  service. No long-running servers: everything in this phase runs in Vercel functions or as
  one-off scripts.
- Existing installs of the v1 script must keep working, unchanged, through the whole phase.
- Production today is small: one site, ~6k page views, ~1.7k sessions. The design targets
  100M events per year per deployment without changing shape, but nothing here is tuned for
  that scale yet.
- Privacy claims on the landing page must be literally true of the implementation. The claim
  becomes: no cookies, no persistent identifiers, and nothing stored in the browser except a
  per-tab session record that dies with the tab and, only if the visitor asks for it, an
  opt-out flag. The copy changes at v1 sunset (§11), not at Phase 0 close: v1 installs keep
  writing a permanent localStorage id until then.

## 3. Architecture

```
browser ── tracker v2 ──▶ POST /api/collect ──▶ validate, bound, enrich, hash ──▶ ClickHouse events
                                                     │                                ▲
old installs ── tracker v1 ──▶ POST /api/lynq ───────┤ (dual-write: Supabase + adapter to v2)
                                                     ▼
                                        Supabase Postgres: sites, hostnames, settings, salts, users

dashboard (Phase 1) ──▶ authorize(principal, site) ──▶ query API (typed, parameterised SQL) ──▶ ClickHouse (read-only role)
```

Components:

| Component | Where | Notes |
|---|---|---|
| Tracker v2 | `packages/tracker`, built to `public/js/` | Served from the app's own domain (§8.1) |
| Ingest v2 | `app/api/collect/route.ts` | Node runtime on Vercel, `maxDuration = 5`; one function invocation per batch |
| Ingest v1 adapter | `app/api/lynq/route.ts` | Keeps writing to Supabase, and additionally maps each v1 event to v2 rows |
| Auth proxy | `proxy.ts` | Its matcher must exclude `/api/collect`, `/api/lynq` and `/js/` (§7.10) |
| ClickHouse | ClickHouse Cloud, one service, one database `lynq` | HTTPS interface via `@clickhouse/client`; three roles (§14) |
| Site registry and settings | Postgres `websites`, `site_hostnames`, `site_settings` | Ingest resolves the request Origin to a site and loads its settings; hits and misses cached 60 s per instance (§7.3) |
| Salts | Postgres `visitor_salts` | One row per UTC day; cleanup by `pg_cron`, not on the ingest path |
| Query API | `lib/query/*` server modules | No SQL outside this directory; entered only through `authorize()` (§9.4) |
| Backfill | `scripts/backfill-clickhouse.mjs` | One-off, idempotent, bounded by `--until` |

## 4. Event model

One wide table. One row per pageview, custom event, engagement update, vitals report, or
identify. Sessions are not stored as rows; they are defined by the client session id (§6).

```sql
CREATE TABLE lynq.events
(
    site_id          UInt32,                    -- websites.id is bigint in Postgres; ingest rejects ids >= 2^32 with a logged error
    ts               DateTime('UTC'),           -- client time, bounded by ingest (§7.2); never rewritten
    seq              UInt32,                    -- tracker's per-tab monotonic counter (§6.1); total order with pageview_id
    event            LowCardinality(String),    -- 'pageview' | 'engagement' | 'custom' | 'vitals' | 'identify'
    name             String DEFAULT '',         -- custom event name; '' otherwise

    visitor_id       UInt64,                    -- §5, computed by ingest
    session_id       UInt64,                    -- §6, generated by the tracker
    user_hash        UInt64 DEFAULT 0,          -- §5.2; 0 when anonymous
    pageview_id      UInt64,                    -- generated by the tracker; ties engagement and vitals rows to their pageview

    -- page context: present on EVERY row, from the batch envelope (§7.1)
    hostname         String,
    path             String,                    -- ≤ 2048 chars
    title            String DEFAULT '',         -- ≤ 512 chars; only when the site enables store_titles (§7.3)
    query            String DEFAULT '',         -- allow-listed query params only (utm_*, ref)

    -- session context: present on EVERY row, captured at session start by the tracker (§7.4)
    referrer         String DEFAULT '',         -- hostname of the session's entry referrer
    referrer_url     String DEFAULT '',         -- entry referrer minus query string, ≤ 2048
    source           LowCardinality(String) DEFAULT '',
    channel          LowCardinality(String) DEFAULT '',   -- Direct | Organic Search | Social | Referral | Email | Paid | Unknown
    utm_source       String DEFAULT '',
    utm_medium       String DEFAULT '',
    utm_campaign     String DEFAULT '',
    utm_term         String DEFAULT '',
    utm_content      String DEFAULT '',

    -- request context: computed per batch by ingest, copied to every row
    country          LowCardinality(String) DEFAULT '',   -- ISO 3166-1 alpha-2; '' unknown
    region           String DEFAULT '',
    city             String DEFAULT '',
    device           LowCardinality(String) DEFAULT '',   -- desktop | mobile | tablet | ''
    browser          LowCardinality(String) DEFAULT '',
    browser_major    UInt16 DEFAULT 0,
    browser_version  String DEFAULT '',
    os               LowCardinality(String) DEFAULT '',
    os_version       String DEFAULT '',
    screen_width     UInt16 DEFAULT 0,
    screen_height    UInt16 DEFAULT 0,
    language         LowCardinality(String) DEFAULT '',

    engaged_ms       UInt32 DEFAULT 0,          -- engagement rows: visible time since the previous report
    scroll_depth     UInt8  DEFAULT 0,          -- engagement rows: max % reached so far

    props            Map(String, String),       -- custom event properties, values ≤ 256 chars
    payload          String DEFAULT '',         -- one large text field per event, ≤ 16 KB: reserved for error stacks (Phase 3); '' otherwise
    vitals           Map(String, Float64),      -- vitals rows (§8.4): lcp, cls, inp, fcp, ttfb, dcl, load, tti, tbt, resources
    vital_targets    Map(String, String),       -- 'lcp' -> element selector, 'inp' -> target selector

    suspect          UInt8 DEFAULT 0,           -- 1 when a soft check failed (§7.2); excluded from queries by default
    ingest_version   UInt8,                     -- 0 backfill, 1 v1 adapter, 2 v2
    received_at      DateTime('UTC') DEFAULT now(),

    INDEX idx_ts        ts             TYPE minmax             GRANULARITY 1,
    INDEX idx_event     event          TYPE set(0)             GRANULARITY 4,
    INDEX idx_name      name           TYPE bloom_filter(0.01) GRANULARITY 4,
    INDEX idx_prop_keys mapKeys(props) TYPE bloom_filter(0.01) GRANULARITY 4
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (site_id, toDate(ts), visitor_id, session_id, ts, seq, pageview_id)
TTL ts + INTERVAL 24 MONTH DELETE
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;
```

Why this shape:

- `ORDER BY (site_id, toDate(ts), visitor_id, session_id, ts, seq, pageview_id)`: every
  dashboard query is "one site, one date range", so it is a contiguous range scan; a visitor's
  rows, and within them a session's rows, are physically adjacent and already in time order,
  which is what sessionisation, funnels, paths, entry/exit and attribution all walk. `event` is
  not in the key: it would split each timeline into per-type runs and buy little, since pageviews
  dominate. The `set` skip index on `event` and the `minmax` index on `ts` handle the
  "pageviews only" and "last five minutes" cases instead. Keys in the sort order also compress
  well because `path`, `country`, `browser` are constant within a session.
- Total order inside a session is `(ts, seq, pageview_id)`. `seq` is a per-tab counter; a
  duplicated tab inherits the counter and would tie, and `pageview_id` (random per page load)
  breaks the tie deterministically.
- Sampling is out of scope; `SAMPLE BY` would have to be chosen now and is not.
- Monthly partitions with `ttl_only_drop_parts = 1`: retention is a partition drop, never a
  part rewrite, at the cost of up to one extra month kept. There are no column TTLs, for the
  same reason; the raw user id lives in Postgres (§5.2).
- `ts` is `DateTime` (seconds). Millisecond precision is not used by any analytics query, it
  halves the sort key, and it keeps `windowFunnel` window units unsurprising. `ts` is never
  rewritten by ingest: an event is either accepted with the time it claims or dropped.
- `Map` columns for props and vitals avoid the one-row-per-property shape the current
  `custom_events` table has. Values are read with `mapContains` guards (§16), never bare
  subscripts, because a missing key returns the type's default. `payload` exists so a Phase 3
  error row can carry a stack trace without lifting the 256-character prop cap.
- `country` is `LowCardinality(String)`, not `FixedString(2)`: FixedString zero-pads the empty
  value into a `"\0\0"` group. Browser and OS versions are plain `String` because they churn
  weekly and would degrade LowCardinality; `browser_major` carries the breakdown-friendly form.
- Skip indexes are declared now because adding one later means materialising it over the
  whole table.
- `pageview_id` links the rows a page load produces (pageview, engagement updates, vitals)
  without storing them in one mutable row. ClickHouse rows are immutable; updates are appends.
- Every row carries page, session and request context (§7.1), so no metric needs a self-join to
  filter engagement or custom rows by path, source, or country. This is also what makes
  "explain this change by source, page, country or device" a single group-by later.
- `suspect` keeps rows that failed a soft check filterable rather than invisible. The query
  layer adds `suspect = 0` unless asked otherwise.
- `ingest_version` lets the dual-write diff (§11) and the backfill be reasoned about per row.
- TTL of 24 months is the default retention. Per-site retention (Phase 2) will be a scheduled
  `DELETE FROM events WHERE site_id = ? AND ts < ?` run by Vercel Cron, since one shared table
  cannot carry a per-site TTL expression.

Reserved for later, not built: a `sessions` materialised view (when session queries get slow),
`error` rows (Phase 3; `event = 'error'`, fingerprint in `props`, stack in `payload`).

### 4.1 Event types and required columns

| event | required beyond the shared context | generated by |
|---|---|---|
| pageview | session_id, pageview_id (tracker); visitor_id (ingest) | both |
| engagement | pageview_id, engaged_ms, scroll_depth | tracker |
| custom | name, props; pageview_id of the page it fired on | tracker |
| vitals | pageview_id, vitals map, vital_targets | tracker's vitals module |
| identify | user_hash (ingest, from `uid`) | both |

Shared context on every row: page context from the batch envelope, session context captured by
the tracker at session start, request context computed by ingest per batch.

### 4.2 Supporting tables

ClickHouse:

```sql
CREATE TABLE lynq.ingest_rejects            -- one row per rejected or flagged batch; never written for successful inserts
(
    ts        DateTime('UTC') DEFAULT now(),
    hostname  String,                         -- request Origin hostname, registered or not
    site_id   UInt32 DEFAULT 0,               -- 0 when the hostname is unregistered
    stage     LowCardinality(String),         -- 'origin_missing' | 'size' | 'unregistered' | 'bot' | 'schema' | 'time_bound' | 'site_mismatch' | 'excluded_ip' | 'excluded_path' | 'insert_failed'
    detail    String DEFAULT ''
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (hostname, ts)
TTL ts + INTERVAL 3 MONTH DELETE
SETTINGS ttl_only_drop_parts = 1;

CREATE TABLE lynq.migrations (name String, applied_at DateTime DEFAULT now()) ENGINE = MergeTree ORDER BY name;
```

Insert failures against ClickHouse itself cannot be recorded in ClickHouse. They go to stdout
as one structured line (`{"lynq":"insert_failed","site":..,"stage":..,"error":..}`) and Vercel's
log drain; the diff script reads them from a `pg_ingest_failures` Postgres table that a
lightweight `after` hook in the route writes when the ClickHouse insert throws or times out
(one Postgres insert on the failure path only). A flood of unregistered hostnames is bounded
by the 60-second negative cache and the 3-month TTL, not by the reject table.

Postgres (Supabase migrations in this phase):

```sql
create table site_hostnames (
  site_id   bigint not null references websites(id) on delete cascade,
  hostname  text   not null,                 -- lowercase, no scheme, no port, no trailing dot
  primary key (site_id, hostname),
  unique (hostname)                          -- one site per hostname
);
-- seeded from websites.url after normalising it to a bare hostname in the same migration

create table site_settings (
  site_id         bigint primary key references websites(id) on delete cascade,
  timezone        text    not null default 'UTC',         -- IANA name; Phase 1 UI
  store_titles    boolean not null default false,
  store_user_ids  boolean not null default false,
  respect_dnt     boolean not null default false,
  excluded_ips    cidr[]  not null default '{}',
  excluded_paths  text[]  not null default '{}',          -- glob patterns, e.g. '/admin/*'
  site_secret     bytea   not null default gen_random_bytes(32)   -- §5.2; not rotatable
);

create table visitor_salts (day date primary key, salt bytea not null, created_at timestamptz default now());
select cron.schedule('visitor_salts_cleanup', '15 0 * * *', $$delete from visitor_salts where day < current_date - 2$$);

create table identified_users (              -- raw ids, only for sites with store_user_ids; §5.2
  site_id    bigint not null references websites(id) on delete cascade,
  user_hash  numeric(20) not null,           -- UInt64 as stored in ClickHouse
  user_id    text not null,
  last_seen  timestamptz not null default now(),
  primary key (site_id, user_hash)
);
select cron.schedule('identified_users_expiry', '30 0 * * *', $$delete from identified_users where last_seen < now() - interval '90 days'$$);
```

The `backfill_salt` (§5.3) is a constant in the backfill script, generated once and committed
to the ticket, not to the repository. All settings and hostnames are read by ingest through
one cached lookup per Origin (§7.3), so a beacon costs at most one Postgres query per hostname
per minute per instance.

## 5. Identity

### 5.1 Anonymous visitors (default, D-003)

```
visitor_id = UInt64 from the first 8 bytes, little-endian, of SHA-256( salt(utc_day(ts)) || site_id_le32 || client_ip || user_agent )
```

Byte order is stated because the ingest function (TypeScript) and the backfill script must
agree, and a shared `lib/ingest/hash.ts` implements it for both, with a fixed test vector.

- `salt(day)` is 32 random bytes per UTC day in `visitor_salts`. A missing row is created with
  `insert ... on conflict do nothing` and then re-read, so two concurrent cold starts agree.
- The ingest function caches salts as a map keyed by day, looks up the day of each request, and
  evicts entries older than one day. It never caches "today's salt" as a single value: a warm
  instance that lived across midnight would otherwise keep yesterday's salt and double-count
  every visitor at the day boundary. The salt read is one Postgres round trip per instance per
  day and is inside the 300 ms warm budget only on the request that fetches it.
- Client IP: `x-vercel-forwarded-for`, which the platform sets from the connection and clients
  cannot influence; `x-real-ip` as the second choice. `x-forwarded-for` is not parsed at all:
  its first entry is client-controlled, and an id derived from it could be minted at will. This
  replaces the TICKET-003 helper in ticket 2, before any v2 row exists.
- What the hash protects against: enumeration. Without the day's salt, nothing can be recovered
  from a stored id. With the salt, checking whether one known IP and user agent visited costs one
  hash. The privacy page says exactly that, and the salt is deleted after two days so the
  window is short.
- Consequence, accepted in D-003: a visitor is a new visitor every UTC day. Every metric that
  counts visitors over more than one day, including the Visitors headline number and goal
  conversion rate, counts visitor-days for anonymous traffic. `identify()` lifts it. This is a
  visible change from today's permanent localStorage id, and the owner decision is in §15.
- The hash is computed in the ingest function. The tracker never sees or stores it. Nothing
  persistent is written to the browser; the browser state is the per-tab session record (§6.1)
  and, if the visitor calls `optOut()`, a flag in `localStorage`.

### 5.2 Identified users

`lynq.identify(userId)` sends an `identify` event and the tracker keeps `uid` in the per-tab
session record and attaches it to every later payload in that tab. Ingest sets

```
user_hash  = UInt64 from SHA-256( site_secret || site_id_le32 || uid ), same byte rule
visitor_id = user_hash
```

where `site_secret` is a per-site random value in `site_settings`. It is not rotatable: rotating
it would orphan every `user_hash`, including the user-deletion path in §14. The same user is the
same visitor across days and devices.

The raw `uid` never enters ClickHouse. When the site has `store_user_ids` on, ingest upserts
`(site_id, user_hash, user_id, last_seen)` into Postgres `identified_users`, expired after 90
days of not being seen. Default is off: the hash is enough for retention, funnels and the
people explorer, and no heuristic on the value's shape is claimed as a safeguard, because none
works. A Global Privacy Control signal suppresses `identify()` unconditionally (§8.2);
`optOut()` and, where the site enables `respect_dnt`, DNT suppress everything.

The mapping from anonymous to identified visitor is not back-filled: rows before the identify
call keep their daily hash. Cross-day stitching is a Phase 3 concern done in queries by
`user_hash`, not by rewriting rows.

### 5.3 Legacy data

Backfilled rows use `visitor_id = hash(backfill_salt || utc_day || site_id || legacy client_id)`
through the same `hash.ts`, salted by day exactly like v2 rows. The table then has one
definition of "visitor" on both sides of the cutover, D-003 is honoured for historical data, and
no permanent cross-day identifier enters the store. The old permanent-id visitor counts remain
available from the Supabase export until those tables are dropped (§11).

## 6. Sessions

A session is `(site_id, visitor_id, session_id)` where `session_id` comes from the tracker. This
is the definition; there is no second one. Every query that selects sessions keys on the pair
`(visitor_id, session_id)`, never on `session_id` alone.

### 6.1 The per-tab session record

The tracker keeps one JSON record in `sessionStorage` under a key namespaced by the `data-site`
value (two Lynq sites on one origin do not collide):

```
{ sid, started, lastActivity, seq, ref, url, uid? }
```

`sid` is a random 64-bit id, replaced after 30 minutes without activity or after 6 hours total.
`seq` is the tab's monotonic event counter. `ref` and `url` are `document.referrer` and
`location.href` at the moment the session was minted (§7.4). `uid` is present only after
`identify()`. The record is per-tab and dies with the tab; nothing in it outlives the visit.
Every storage access is wrapped in try/catch: Safari's storage blocking, Firefox's cookie
blocking and some extensions make the accessor throw, and the fallback is an in-memory record
for that page load. A batch already queued when the session expires is flushed under the old
`sid` before the new one is minted.

Tabs opened from a link (`target="_blank"`, middle-click) receive a copy of the opener's
`sessionStorage`, per the HTML specification's session-storage clone on new-context creation,
so a middle-clicked link continues the session for free. No cross-tab messaging is used. A tab
opened by typing the URL starts a new session, which is correct.

Known cases, and what the dashboard shows:

- Duplicated or restored tabs share a session id and a starting `seq`: their rows interleave in
  one session, ordered by `(ts, seq, pageview_id)`. Entry page is the earliest row, exit page the
  latest. Acceptable.
- A session spanning UTC midnight is split, because `visitor_id` rotates: two sessions, each
  with the same `session_id` but different visitors. Accepted with D-003.
- Many people behind one IP with the same browser share a `visitor_id` but have distinct session
  ids, so sessions, bounces and durations stay per person. This is why the client id is the
  definition and gap-based sessionisation is not: a timestamp-only method would merge an office
  into one all-day session.

The server does not validate `session_id` beyond shape; it cannot, and per-instance memory on
Vercel is not shared. Repair for damaged data happens in queries: within one `session_id`, a gap
over 30 minutes or a span over 6 hours splits the session. Repair never merges across ids.

### 6.2 Engagement

The tracker accumulates visible milliseconds per pageview (`visibilitychange`, `focus`/`blur`)
and scroll depth, both reset on every navigation and on a bfcache restore. It reports them as an
`engagement` row carrying the delta since the last report:

- piggybacked on any batch that is going out anyway (a custom event, a navigation),
- standalone on `visibilitychange` to hidden and on `pagehide`,
- and as a safety flush after five minutes of continuous visibility with nothing else sent.

There is no periodic beacon: every request is a billable function invocation on Vercel, and a
60-second timer would be 60 invocations per visitor-hour. This schedule is 2 to 13 per
visitor-hour with the same accuracy, because the delta model does not care when it is reported.
Per-pageview engaged time is `sum(engaged_ms)` over its `pageview_id`. This replaces the
`beforeunload`-only session duration the review found unreliable.

### 6.3 Definitions, in one place

`lib/query/sessions.ts` owns these; the diff script and every screen import from it.

- Session start: `min(ts)` over the session. Session metrics are bucketed by session start.
- Duration: `sum(engaged_ms)` over the session. "Time on site", `max(ts) - min(ts)`, is a
  separate named metric and is not the default.
- Bounce: exactly one pageview, `sum(engaged_ms) < 10000`, and no custom event. A visitor who
  reads one article for five minutes is not a bounce.
- Pages per session: `countIf(event = 'pageview')`.
- Entry page: `argMin(path, (ts, seq, pageview_id))` over pageview rows. Exit page: `argMax`.
- Ordered path list: `arrayMap(t -> t.2, arraySort(t -> t.1, groupArray(((ts, seq, pageview_id), path))))`.
  `groupArray` alone is unordered. Loop collapsing for the paths feature is `arrayCompact` over
  this list; path exclusions are a filter on it.

## 7. Ingest API v2

`POST /api/collect`, Node runtime, `export const dynamic = "force-dynamic"`,
`export const maxDuration = 5`.

### 7.1 Request

Every batch carries the page it belongs to and the session context. An event is stamped with
the current `page` and `pid` at enqueue time; a navigation flushes the pending batch
synchronously before the new `pid` is minted, so a batch never spans two pages.

```json
{
  "v": 2,
  "site": "lynq.byharsh.com",   // cross-check only; the site is resolved from the Origin header (§7.2)
  "sid": "8f3c...",             // session id, 16 hex chars
  "pid": "a91e...",             // pageview id, 16 hex chars
  "uid": "user_123",            // optional, after identify()
  "page": { "url": "https://lynq.byharsh.com/pricing?utm_source=x", "title": "Pricing" },
  "session": { "ref": "https://www.google.com/", "url": "https://lynq.byharsh.com/?utm_source=x" },
  "ctx": { "sw": 1440, "sh": 900, "lang": "en-GB" },
  "events": [
    { "t": "pageview",   "ts": 1788612834219, "seq": 41 },
    { "t": "custom",     "ts": 1788612900000, "seq": 42, "name": "signup", "props": { "plan": "pro" } },
    { "t": "engagement", "ts": 1788612900000, "seq": 43, "ms": 65780, "scroll": 72 },
    { "t": "vitals",     "ts": 1788612901000, "seq": 44, "m": { "lcp": 1834, "cls": 0.02, "inp": 120 },
      "targets": { "lcp": "img.hero" } }
  ]
}
```

The engagement row above is the piggyback on the custom event's batch, not a timer. `session.ref`
and `session.url` come from the session record (§6.1), so every batch, including engagement-only
ones, carries the session's referrer, source, channel and UTM.

Transport contract:

- The body is JSON sent as `text/plain;charset=UTF-8`: `navigator.sendBeacon(url, new Blob([json],
  { type: "text/plain;charset=UTF-8" }))`, or `fetch(url, { method: "POST", body: json, keepalive:
  true })` with no `Content-Type` header set. Either way the request is a CORS simple request
  and no preflight happens. v1 sends `application/json`, which is why the v1 route needs its
  OPTIONS handler; v2 does not repeat that.
- The response carries `Access-Control-Allow-Origin: <request Origin>` and `Vary: Origin`, no
  credentials, on 202 and on 400. Without it, `fetch` responses are blocked and every customer's
  console logs a CORS error on every beacon. An OPTIONS handler returns 204 with the same headers
  for tooling that sends one anyway.
- Client batch cap: 8 KB and 20 events; bigger queues split into several beacons.
  `sendBeacon` has a 64 KiB in-flight quota shared across the document and returns `false` when
  exceeded; the tracker checks the return value and falls back to `fetch(keepalive)`.
- The tracker batches over 1 s and flushes on `pagehide` with `sendBeacon`.

### 7.2 Pipeline, in order

1. Gate before parsing. A missing `Origin` → 400 (`origin_missing`); `Content-Length` over
   32 KB → 400 (`size`). Both are rejects, counted in `ingest_rejects`.
2. Resolve the `Origin` hostname to a site and its settings (§7.3). Unregistered → 202,
   nothing written, `unregistered` counted. `site_id ≥ 2^32` → logged error, 202.
3. Excluded IP: if the client IP (§5.1) is in the site's `excluded_ips` → 202, `excluded_ip`
   counted. This has to be here: the raw IP exists nowhere else.
4. Bot check with `isbot` on `User-Agent`. Bot → 202, nothing written, `bot` counted.
5. Parse and validate with a zod schema → 400 (`schema`) on shape errors: `sid` and `pid` must be
   16 hex chars, `events` non-empty, every event needs `t`, `ts`, `seq`, `page.url` must parse as
   a URL on the resolved site or one of its hostnames. Unknown fields are dropped, not rejected,
   so an older server can accept a newer tracker.
6. Soft checks, per batch, each of which sets `suspect = 1` on the batch and counts a reject
   row: body `site` differs from the resolved hostname (`site_mismatch`); `seq` not strictly
   increasing within the batch.
7. Time bounds, per event: `ts` outside `[received_at - 24 h, received_at + 5 min]` → the event
   is dropped and `time_bound` counted. Accepted events keep their `ts` exactly as sent;
   nothing is ever rewritten to `received_at`, because the tracker's normal batching makes
   every event a few seconds old on arrival and a "correct small skew" rule would touch
   every row.
8. Excluded path: events whose `page.url` path matches one of the site's `excluded_paths` are
   dropped and `excluded_path` counted.
9. Enrich once per batch: geo from platform headers (TICKET-003), user agent parsed with
   `ua-parser-js` into browser, major, version, OS, version, device class; `screen_width`,
   `screen_height`, `language` from `ctx`.
10. Parse `page.url` into hostname, path (≤ 2048), allow-listed query; `page.title` only when
    `store_titles` is on (≤ 512); parse `session.ref` and `session.url` into referrer hostname,
    `referrer_url` (≤ 2048), source, channel and `utm_*` (§7.5). Strip C0 and C1 control
    characters from every string.
11. Compute `visitor_id` (§5) once per batch, and `user_hash` when `uid` is present; upsert
    `identified_users` when `store_user_ids` is on.
12. Build rows, insert with `@clickhouse/client` using `async_insert = 1,
    wait_for_async_insert = 1, async_insert_busy_timeout_ms = 200` and a client
    `request_timeout` of 2000 ms. ClickHouse buffers small inserts server-side so one invocation
    per beacon does not create one part per beacon, and waiting for the flush means schema and
    quota errors come back to the function instead of vanishing. On error or timeout: one
    structured stdout line, one row in `pg_ingest_failures` (§4.2), and still 202. A slow store
    costs at most two seconds of function time, never the whole `maxDuration`.
13. Respond 202 with an empty body and the CORS headers. Budget: under 300 ms warm.

The response is 202 for everything after the gates: the tracker never retries, so a 5xx would
only lose the same data with extra load.

### 7.3 Site resolution, settings and hostnames

Exact match on a lowercase hostname, after stripping one leading `www.`, against
`site_hostnames`. A site's registered `websites.url` is normalised to a bare lowercase hostname
in the migration and inserted as its first hostname; additional hostnames (staging domains, an
app subdomain) are explicit rows the owner adds in settings (Phase 2 UI; a migration-seeded row
until then). There is no parent-domain matching: a customer who registered `github.io` or
`corp.com` would otherwise receive every sibling's traffic. The lookup returns the site id and
its `site_settings` row in one query, and hits and misses are both cached for 60 s per function
instance, so a flood of random hostnames costs one Postgres query per hostname per minute per
instance, not one per beacon. A settings change is therefore live within a minute.

Path and query handling: the path is stored as sent, without the query string. Only `utm_*` and
`ref` are kept in `query`, so no PII from search or account URLs is stored. Hash fragments are
dropped. Path segments themselves (`/reset/<token>`, `/invite/<code>`) are the customer's
responsibility and the docs say so; `excluded_paths` is the tool for it today and a masking
option is Phase 2. Page titles are off by default (`store_titles`), because search pages and
logged-in apps put user content in `document.title`.

### 7.4 Referrer

Referrer is a session property. The tracker captures `document.referrer` and `location.href`
when it mints a session id, keeps them in the session record, and sends them as `session.ref`
and `session.url` on every batch. A referrer on one of the site's own hostnames is internal
navigation and yields `referrer = ''`. Ingest classifies once per batch and copies the result to
every row, so "source" and "campaign" are available on engagement and custom rows without a
join. This differs from v1, which stored the previous page as a per-pageview referrer; the diff
(§11) compares referrers at session grain for that reason.

### 7.5 Source and channel classification

A table in `lib/ingest/referrers.ts` maps referrer hostnames to a display source ("Google",
"DuckDuckGo", "X", "LinkedIn", "Hacker News", "Product Hunt", ...) and a channel. UTM overrides:
`utm_medium` in (cpc, ppc, paid) → Paid; email → Email; social → Social; otherwise Referral with
`source = utm_source`. Empty referrer and no UTM → Direct. Unmatched hostname → Referral with
`source = hostname`. The list is seeded from Plausible's public referrer map (MIT) and is data,
not code, so it can grow without a deploy.

### 7.6 Identify

An `identify` event stores a row and, for the rest of the batch, `user_hash`. Later batches carry
`uid` themselves. `uid` is limited to 128 characters. Raw storage rules are in §5.2.

### 7.7 Custom events

`name` ≤ 64 chars, ≤ 20 props, keys ≤ 32 chars, values stringified ≤ 256 chars. Numbers keep a
string form; `revenue`-type aggregation in Phase 2 parses `props['revenue']` in the query, and
the convention for it (a `revenue` prop in minor units plus a `currency` prop) is documented
then. Oversize payloads are truncated, not rejected. The Phase 1 dashboard renders every
event-derived string as text; `dangerouslySetInnerHTML` is never used on them.

### 7.8 Abuse

Anyone can send a beacon; that is the nature of the endpoint. What bounds the damage:

- The site comes from `Origin`, which a browser page cannot forge for another site. A script
  can, so the rest exists.
- A Vercel Firewall rate-limit rule on `/api/collect`: 600 requests per minute per client IP,
  configured in the dashboard as part of ticket 3. Generous enough for a corporate NAT, and
  the actual flood control; it needs no code.
- Size gate before parsing, event count limit, time bounds, trusted client IP so visitor ids
  cannot be minted by header, `suspect` marking instead of silent drops, reject counts by
  hostname.
- The dual-run diff (§11) reports `suspect` and reject counts per day, so an injection during
  the validation window shows up as a number, not as a mystery discrepancy.

A per-site token bucket keyed by resolved site remains a Phase 1 option if the firewall rule
proves too coarse. A "suspicious volume" alert is Phase 3.

### 7.9 Diagnostics

Every reject is counted in `ingest_rejects` by hostname and stage, so "why is my site empty" is
one query. A script tag with `data-debug` makes the tracker append `?debug=1`, and the endpoint
then returns a JSON body naming the reject stage. Because the parameter is client-supplied, the
verbose response is returned only when the Origin resolves to a registered site; for an
unregistered hostname it stays an empty 202, so the endpoint cannot be used to enumerate
registered hostnames.

### 7.10 Proxy

`proxy.ts` currently matches every path except static assets and redirects anonymous requests
to `/login`, calling Supabase Auth on each. Its matcher gains `api/collect`, `api/lynq` and `js/`
in the negative lookahead so the proxy does not execute on the ingest or script paths at all
(one fewer auth round trip per v1 beacon, and no 307 for v2). A CI assertion checks that
`GET /js/lynq.js` and `POST /api/collect` return 2xx with no `Set-Cookie`, no `Location`, and
the expected `Cache-Control` on the script.

### 7.11 v1 adapter

`/api/lynq` keeps its current behaviour and, after its Supabase writes, maps the event to v2 rows
and inserts them with `ingest_version = 1`:

- session-start → pageview
- page-view → pageview
- session-end → one engagement row with `engaged_ms = sessionDuration` and one vitals row,
  both attached to the session's most recent pageview (tracked per instance; if unknown, a
  `pageview_id` hashed from the session id)
- custom-event, initial-custom-event → custom rows, props from the property list, attached the
  same way
- `session_id` is the legacy text id hashed through `hash.ts`; `seq` is a per-instance counter
  per session; `source` and `channel` are classified from the v1 per-pageview referrer of the
  session's first pageview, which is the best the v1 payload allows

In the same ticket, the route's fire-and-forget Supabase writes (`addPageView`,
`addCustomEvent`, currently not awaited) are wrapped in `waitUntil()` from `@vercel/functions`,
a new dependency. This is best effort: it keeps the instance alive for the pending writes on
Vercel and is a no-op elsewhere, so the v1 Supabase path becomes more durable, not equal to the
awaited ClickHouse insert. `visitor_id` for v1 rows uses the legacy scheme (§5.3). The adapter
is deleted when v1 traffic stops (§11).

## 8. Tracker v2

### 8.1 Shape

- Source in `packages/tracker/src`, TypeScript, built by esbuild. Two chunks plus the vitals
  module:
  - core, budget 3 KB gzipped: session record and expiry, storage fallbacks, SPA navigation,
    batching with sendBeacon and the keepalive fallback, engagement and scroll depth, GPC/DNT/
    optOut, localhost check, the queue stub, `track()` and `identify()`;
  - extras, loaded only when the script tag carries `data-outbound` or `data-auto-events`:
    outbound link and download clicks, declarative `data-lynq-event` elements;
  - vitals, loaded only with `data-vitals`: Google's `web-vitals/attribution` build plus
    navigation timing (§8.4), about 4.5 KB gzipped on its own.
- Served at `https://lynq.byharsh.com/js/lynq.js` directly from `public/` with
  `Cache-Control: public, max-age=300, stale-while-revalidate=86400` set through the
  `headers()` block in `next.config.mjs`, so Vercel's edge caches it and a deploy reaches
  visitors within five minutes. The immutable `/js/lynq.<hash>.js` is published alongside for
  pinned installs, and it is the URL the docs offer with an `integrity` attribute. No redirects:
  a redirect would add a round trip in front of a deferred script and make Subresource Integrity
  impossible.
- Install snippet: `<script defer src="https://lynq.byharsh.com/js/lynq.js" data-site="example.com"></script>`.
  The stub for early `lynq.track()` calls stays a one-liner queue as today.
- The full configuration surface is the script tag: `data-site` (required), `data-vitals`,
  `data-outbound`, `data-auto-events`, `data-allow-localhost`, `data-debug`, `data-respect-dnt`.
  Server-side settings that only the server can enforce (`store_titles`, `store_user_ids`,
  exclusions) live in `site_settings`; settings the browser must act on are attributes,
  because the tracker is one static file with no configuration fetch. `respect_dnt` is
  therefore an attribute the owner copies from settings into their snippet, and the settings
  page says so.
- `lynq-js` on GitHub is archived at its last v1 commit with a README pointing here. An archived
  repository keeps serving its HEAD through jsDelivr, so the existing install URL is frozen on v1
  and keeps flowing through the adapter until those sites upgrade.

### 8.2 Behaviour

| Concern | v1 | v2 |
|---|---|---|
| Visitor id | localStorage UUID, permanent | none; server hash |
| Session | localStorage, 10 min | per-tab session record in sessionStorage (§6.1), 30 min idle / 6 h max; try/catch with in-memory fallback; new tabs from links inherit it via the browser's own sessionStorage clone |
| Session referrer | none | captured at session start, sent on every batch |
| SPA navigation | MutationObserver on the whole DOM | patched pushState/replaceState + popstate + hashchange; a pageview is emitted only when the normalised `pathname + allow-listed query` differs from the last recorded one, so `replaceState` spam from scroll-restoration and hash-only changes record nothing; the pending batch is flushed before the new `pid` is minted; engagement and scroll accumulators reset |
| Back/forward cache | nothing | `pageshow` with `event.persisted`: re-check session expiry, mint a new `pid`, emit a pageview, reset the accumulators |
| Duration | beforeunload, one number per session | engagement deltas on hidden, pagehide, piggybacked on other batches, 5-minute safety flush (§6.2) |
| Scroll depth | none | max % per pageview, on engagement rows |
| Outbound links, downloads | none | extras chunk; capturing click listener; sent as custom events `outbound`, `download` |
| Declarative events | none | extras chunk; `data-lynq-event="signup" data-lynq-prop-plan="pro"` on any element |
| UTM, screen, language, title | none | on every batch (title only reaches storage when the site allows it) |
| Vitals | own observers, inaccurate INP | vitals module (§8.4) |
| Transport | one sendBeacon per event | 1 s batching, 8 KB / 20 event cap with splitting, sendBeacon on pagehide with keepalive fallback, `text/plain` body (§7.1) |
| Global Privacy Control | none | honoured unconditionally, no switch: forces anonymous mode (no `identify()`, no `uid`), pageviews continue. GPC is a recognised opt-out under CPRA and the Colorado and Connecticut statutes; a switch to ignore it would make Lynq the processor that facilitated ignoring it |
| Do Not Track | none | honoured only when the snippet carries `data-respect-dnt` (default off; the signal is discontinued and most vendors ignore it) |
| Opt-out | none | `lynq.optOut()` writes `localStorage['lynq_optout'] = '1'` and stops everything; `lynq.optIn()` removes it. This is the one persistent value the tracker can write, and only on request |
| Errors | constant defined, never sent | out of scope (Phase 3 module) |
| Localhost | tracks | ignored unless `data-allow-localhost` |
| Debug | none | `data-debug` → endpoint answers with the reject stage for registered sites (§7.9) |

`lynq.track(name, props)`, `lynq.identify(uid)`, `lynq.optOut()`, `lynq.optIn()` are the whole
public API. `window.lynqQueue` stays for the stub.

### 8.3 Tests

Payload contract tests: the tracker's TypeScript types for the request are generated from the
server's zod schema (`zod-to-ts`), so the two cannot drift. Behaviour tests run in Playwright
against a fixture page whose script points at a local recorder, not the real route:

- SPA navigation produces a pageview in a new batch carrying the new page context.
- `replaceState` to the same URL and a hash-only change produce nothing.
- Hiding the tab produces an engagement row with the right `pid`.
- A bfcache restore (back navigation) produces a pageview with a new `pid`.
- A `data-lynq-event` click produces a custom event (extras chunk loaded).
- A tab opened from a link continues the session id.
- The batch flushes on pagehide; an oversized queue splits.
- A project running with site data blocked still records pageviews with an in-memory session.
- An invariant test: a random walk of N navigations, hides, clicks and an `identify`, then an
  assertion over every captured batch: non-empty `page.url` and `session.ref`, `pid`
  consistent with the batch's page, a distinct `pid` on either side of each navigation,
  strictly increasing `seq`. This is the test that would have caught the missing-page-context
  class of bug from review 1, and its server-side mirror is a `countIf(path = '')` column in
  the diff report.

### 8.4 Vitals module

The current Performance tab shows thirteen numbers: LCP, INP, CLS, FCP, TTFB, TBT, TTI, DCL,
load, resource count, interaction count, and the two JS heap sizes. Google's `web-vitals`
library produces the first five. To keep the tab whole after cutover, the module also reads
`performance.getEntriesByType('navigation')` once per page load for `dcl`, `load` and `tti`
(`domInteractive`, which is what v1 called TTI), sums `longtask` entries over 50 ms for `tbt`,
and counts resource entries. All of these go into the `vitals` map under those keys, one row
per page load, so the p75 query is the same for every metric. What is dropped, deliberately:
`totalJSHeapSize` and `usedJSHeapSize` (Chrome-only, non-standard, and not a performance
signal) and `interactionCount` (INP with attribution supersedes it). The JS heap card and chart
are retired in Phase 1; this is the one visible loss and it is listed for the owner in §15.

## 9. Query API foundations

`lib/query/` is the only place with SQL. Everything takes a `QueryContext`:

```ts
type QueryContext = {
  siteId: number;              // from authorize(), never from the caller (§9.4)
  range: DateRange;            // { from, to } in UTC, resolved from a Range (§9.1)
  compare?: DateRange;         // previous period or same period last year; resolved the same way
  timezone: string;            // site_settings.timezone; buckets and calendar ranges use it
  filters: Filter[];           // { dimension, op: 'is' | 'is_not' | 'contains', values: string[] }
  includeSuspect?: boolean;    // default false
};
```

### 9.1 Ranges and granularity

A `Range` is either rolling (`last_24h`, `last_7d`, `last_30d`, `last_90d`, `last_12mo`) or
calendar (`today`, `yesterday`, `this_week`, `this_month`, `custom(from, to)`). Rolling ranges
end now; calendar ranges are computed in the site timezone and converted to UTC bounds. The
comparison range is the same length immediately before, or the same calendar period a year
earlier. Granularity is `hour`, `day`, `week` (Monday start), or `month`; buckets are
`toStartOfInterval(ts, ..., timezone)` so a day is the site's day. Today's dashboard buckets in
the viewer's browser timezone; after cutover it buckets in the site's, which is the Tier 1
requirement and is the reason timezone is in this phase rather than the next.

### 9.2 Primitives

- `timeseries(ctx, metric, granularity)` for pageviews, visitors, sessions, bounce rate,
  engaged time, pages per session, custom event count, goal count (Phase 2 supplies goals).
- `breakdown(ctx, dimension, metric, { limit, offset })` for path, entry path, exit path,
  referrer, source, channel, utm_*, country, region, city, device, browser, browser major, os,
  os version, screen size (`screen_width × screen_height`), screen bucket, language, custom
  event name, custom prop key, custom prop value (for a given key). Rows are sorted by the metric
  descending; the response carries the total so the UI can show "N more" and page through.
  Entry and exit path are session dimensions: the breakdown groups sessions, not rows, and only
  session metrics are legal for them; the compiler rejects the other combinations.
- `summary(ctx)` for the KPI strip: every scalar metric for `range` and, when present,
  `compare`, in one query pair.
- `rows(ctx, kind, { limit, cursor })` for the three things the aggregates cannot do: recent
  custom events with their session context (today's Events tab), a session's ordered events
  (sessions explorer), and the sessions matching a `sessionWhere` (funnel drop-off drill-down).
  Under the daily hash a "person" is a visitor-day with nothing displayable, so the drill-down
  shows sessions and their pages; with `identify()` it can show a user.

### 9.3 Filters

`Filter.values` is plural: within one dimension the values are ORed, across dimensions the
filters are ANDed, which is what today's click-to-filter does. The compiler emits two clause
sets:

- `rowWhere`: dimensions that live on the row (path, country, device, source, ...), applied
  directly.
- `sessionWhere`: session-level predicates (entry path, exit path, bounced, converted on goal,
  duration over N), applied as `(visitor_id, session_id) IN (SELECT (visitor_id, session_id)
  FROM events WHERE <site, range> GROUP BY visitor_id, session_id HAVING <predicate>)`. The
  pair, never `session_id` alone: ids are client-generated and a visitor rotation at midnight
  reuses one.

Session metrics (sessions, bounce rate, duration, pages per session) are computed over whole
sessions selected by both clause sets and bucketed by session start, never by row timestamp.
A row-only filter on `path = '/pricing'` combined with bounce rate would otherwise answer
"sessions consisting of exactly one /pricing pageview", which is not the question.

Saved segments (Tier 1) are a `Filter[]` serialised as JSON in a Postgres table in Phase 1; the
compiler does not know whether a filter came from the URL or a segment, and the two compose by
concatenation.

Dimension and metric names are validated against an allow-list before they are placed in SQL;
values go through `@clickhouse/client` query params, never string interpolation. Every query
adds `site_id = {siteId}` and, by default, `suspect = 0`.

### 9.4 Authorization seam

Nothing calls a primitive without a context, and a context comes only from
`authorize(principal, siteRef)` in `lib/query/authorize.ts`. In Phase 0 the only `principal`
is the Supabase session user, and the check is the existing ownership lookup (`authorizeWebsite`
in `lib/actions.ts`, which will return the site id it already selects). The function signature
admits the later principals without touching `lib/query`: an API key (Tier 1 REST API), a share
token (Tier 1 public dashboards), and a team membership (Tier 1 roles). Each is a Postgres table
and a branch in `authorize()`, added in the phase that ships the feature.

## 10. Backfill

`scripts/backfill-clickhouse.mjs --site <url> --until <ISO> [--dry-run]`, run once from a
laptop with the service-role key and the ClickHouse admin credentials. `--until` is the
timestamp the v1 adapter went live (ticket 4 deployed), recorded in the ticket; the export
reads `created_at < until` and the wipe deletes `ingest_version = 0 AND ts < until`, so
adapter-written rows are never touched and re-runs are safe. The wipe is an
`ALTER TABLE ... DELETE` mutation; the script polls `system.mutations` until `is_done = 1`
before inserting. Inserts go in batches of 10,000 rows with progress on stdout; a failed run
is re-run from the start, which the wipe makes safe.

| Supabase | ClickHouse rows |
|---|---|
| `page_views` joined to `sessions` on `session_id` | one `pageview` per row; geo, device, browser, os from the session; referrer parsed and classified with the same code as ingest (`'Unknown'`, the column default, classifies as Direct); `visitor_id` per §5.3; `session_id` hashed from the legacy id; `pageview_id` hashed from the page_views `id`; `seq` from row order within the session. A page view whose session row is missing (the FK cascade makes this rare) gets `visitor_id` hashed from its session id and `'Unknown'` device fields, as today's dashboard renders it |
| `sessions.session_duration` | one `engagement` row per session, `engaged_ms = session_duration`, attached to the session's last pageview |
| `vitals` joined to `sessions` | one `vitals` row per vitals row, attached to the session's last pageview; every legacy key into the `vitals` map (Float64, so integer byte counts are exact) |
| `custom_events` grouped by `event_id` | one `custom` row with `props` from the property rows, attached to the session's pageview closest before it |
| `visitors` | not needed; visitors are derived |

Approximations, stated: legacy `device` stays as stored (no tablets, since v1 derived it from the
OS alone); legacy `country` names are mapped to ISO codes with `i18n-iso-countries`, and the
script prints every name it could not map instead of silently writing `''`; legacy bounce and
duration definitions are not reproduced (§11). The cutover date is written into the ticket and
into the Phase 2 annotations table when that exists, so a device or country step change on that
day is explained, not investigated.

All backfilled rows have `ingest_version = 0`. The script reports counts per table on both
sides.

## 11. Dual-write, dual-run, diff, cutover

1. Ingest v2 and the v1 adapter both live. Existing installs send v1 traffic, which arrives with
   `ingest_version = 1`. The backfill covers everything before `--until`.
2. Lynq's own site runs both trackers for the window: v1 to `/api/lynq`, v2 to `/api/collect`.
   This is the only way the new path (endpoint, zod schema, batching, session logic, hashing)
   sees production traffic before Phase 1 depends on it.
3. `scripts/diff-stores.mjs` computes, per site and day: pageviews, unique visitors, sessions,
   bounce rate, top 10 paths, top 10 session-entry referrers, from three places: Supabase read
   directly with the service role and no row cap (not through `getAnalytics`, which caps at
   5,000 rows), ClickHouse `ingest_version = 1`, and for Lynq's site ClickHouse
   `ingest_version = 2`. Supabase visitors are `count(distinct client_id)` from sessions, the
   definition the period-summary function uses. It also prints the day's `suspect` count,
   reject counts by stage and hostname, `countIf(path = '')`, insert failures from
   `pg_ingest_failures`, and partition and mutation health (§14).
4. Exit criteria: Supabase vs v1 rows agree on pageviews and top paths within 0.5% with every
   discrepancy attributed (after `waitUntil()` lands, the remaining gap is timing at the day
   boundary); v1 rows vs v2 rows on Lynq's site agree on pageviews within 2% (different session
   and batching rules explain the rest, and each difference is written down); `countIf(path =
   '')` is zero on v2 rows. Visitors, bounce, duration and referrers are expected to differ by
   definition and are reported, not gated: the daily hash counts lower than the permanent id
   where one IP and browser is shared and higher where IP or user agent changes within a day;
   the direction is not predictable and is not a criterion.
5. Run daily for seven days. Then Phase 1 switches the dashboard's reads to the query API. The
   Supabase event tables keep receiving writes until Phase 1 ships and one more week of
   comparison passes; then the v1 route stops writing to Supabase, the tables are exported and
   dropped, and the adapter remains only for v1 installs, until none has sent a row for 30 days.
   The landing-page privacy copy changes at that point (§2).

## 12. Repository layout

npm workspaces, not Turborepo: two packages is not enough to justify a build orchestrator.

```
packages/tracker/            source, tests, esbuild config; build output copied to public/js/
lib/ingest/                  v2 pipeline, hash.ts, referrer table, ua parsing, time bounds, site resolution and settings cache (server only)
lib/clickhouse/              clients (ingest, read, admin), migrations, runner
lib/query/                   authorize.ts, primitives, filter compiler, sessions.ts, ranges.ts
scripts/                     backfill, diff, clickhouse-migrate
app/api/collect/route.ts     v2 endpoint (+ OPTIONS)
app/api/lynq/route.ts        v1 endpoint + adapter
proxy.ts                     matcher excludes api/collect, api/lynq, js/
next.config.mjs              headers() for /js/*
supabase/migrations/         site_hostnames, site_settings, visitor_salts, identified_users, pg_ingest_failures, pg_cron jobs, url normalisation
```

The Next app stays at the repository root; moving 80 files into `apps/` is not part of this
phase. ClickHouse schema lives in `lib/clickhouse/migrations/NNN_*.sql`, one statement per file
(the HTTP interface takes one statement per request), applied in name order by
`scripts/clickhouse-migrate.mjs`, which records each applied file in `lynq.migrations` and stops
at the first failure; ClickHouse DDL is not transactional, so a failed migration is fixed
forward, never rolled back. Same discipline as Supabase migrations.

## 13. Testing and CI

- Unit (vitest, fast, no services): `hash.ts` against the fixed vector, salt caching across a
  day boundary, time bounds, client IP selection, hostname normalisation and resolution,
  excluded IP and path matching, url/referrer/utm parsing, channel classification, string caps
  and control-character stripping, the range resolver in three timezones, the filter compiler
  including `sessionWhere` and the AND/OR rule, the zod schema and the reject/suspect matrix,
  the v1 adapter mapping, the backfill mapping and its unmapped-country report.
- Integration (vitest + ClickHouse in Docker, `clickhouse/clickhouse-server`): migrations apply
  from empty using a CI-only admin credential for the container, never the production one;
  inserting the fixture batch and running each primitive returns the expected numbers; session
  repair splits on a 31-minute gap inside one session id and never merges two ids; bounce and
  duration match §6.3 on fixtures; `suspect` rows are excluded by default; the diff script
  agrees with itself on a fixture; p75 ignores rows without the metric; the read role cannot
  insert and cannot raise its resource limits.
- Tracker (Playwright): §8.3, plus the proxy and cache-header assertion from §7.10.
- Scripts: `npm run verify` stays lint, typecheck, ticket check and **unit tests only**, so a
  commit needs neither Docker nor a browser; `test:integration` and `test:e2e` are separate.
  CLAUDE.md is amended in ticket 1: rule 5 gains "`npm run test:integration` and
  `npm run test:e2e` passed" as close evidence for any ticket touching `lib/ingest`,
  `lib/query`, `lib/clickhouse` or `packages/tracker`, since the repo commits to `main` without
  pull requests and "required to merge" would gate nothing.
- CI: two jobs. `verify` stays as it is plus unit tests, fast on every push. `test` adds a
  ClickHouse service container and Playwright with `actions/cache` on `~/.ms-playwright`,
  `timeout-minutes: 20`.

## 14. Operations

- ClickHouse Cloud, smallest tier, one service, `lynq` database. Idle scaling stays on for cost;
  the first beacon after a quiet period may take seconds on the ClickHouse side, which the 2 s
  client timeout turns into a counted insert failure rather than a hung function. If that
  failure rate is visible in the diff report, idle scaling is turned off; the cost difference is
  the only thing at stake.
- Three roles: `lynq_ingest` (INSERT on `events`, `ingest_rejects`), `lynq_read` (SELECT only,
  `readonly = 2` so the client can still pass query settings, with `max_execution_time = 30`,
  `max_rows_to_read = 500000000` and `max_memory_usage = 4 GiB` set as **constraints** in the
  settings profile so a client cannot raise them), `lynq_admin` (DDL and mutations, used by the
  migration runner, the backfill and deletions). Credentials in Vercel env and `.env`:
  `CLICKHOUSE_URL`, `CLICKHOUSE_INGEST_PASSWORD`, `CLICKHOUSE_READ_PASSWORD`; the admin password
  lives only in `.env` on the laptop that runs migrations, and CI uses its own container.
- The read role is the tenant boundary (D-002). `lib/query` always adds `site_id = {siteId}`
  from an `authorize()` context; the allow-list plus parameters is what makes that hold.
- Cost at current volume: near the development tier's floor; budget $50/month ceiling for this
  phase. Volume math: 100M events/year at ~150 bytes compressed per row is ~15 GB/year; the sort
  order keeps session-constant columns compressible. Vercel: invocations are bounded by the
  engagement schedule in §6.2; at 100M events/year and ~1.3 events per invocation that is
  roughly 6.5M invocations a month, inside the Pro plan allowance.
- Rejects and failures: `ingest_rejects` in ClickHouse, insert failures in Postgres (§4.2).
  Alerting on either is Phase 3; until then the diff script prints the day's counts.
- Part health: time bounds keep partitions to about 25 live months. A weekly check of
  `system.parts` partition count and `system.mutations` backlog is part of the diff script's
  report during Phase 0.
- Backups: ClickHouse Cloud's daily backups; the Supabase tables stay until §11 step 5.
- Deletion: a site delete runs `DELETE FROM lynq.events WHERE site_id = {id}` (lightweight
  delete, `_row_exists` mask; space returns on merge) and the Postgres cascades do the rest. A
  user-level deletion request deletes by `user_hash` in ClickHouse and by primary key in
  `identified_users`. Anonymous rows have no key to delete by, which is the point.
- Secrets: `visitor_salts`, `site_settings.site_secret` and `identified_users` are readable
  only by the service role.

## 15. Risks, and the decisions the owner is asked for

| Risk | Handling |
|---|---|
| Vercel function cold starts add 200 to 500 ms to the first beacon | The tracker never waits on the response; beacons are fire-and-forget |
| `wait_for_async_insert = 1` adds up to 200 ms of function time per request | Accepted for correctness; bounded by the 2 s client timeout. Invocation count, not duration, is the cost driver, and §6.2 bounds it |
| ClickHouse down or waking from idle | 2 s timeout, 202 to the client, failure row in Postgres; data for that window is lost, which is the accepted policy for a beacon endpoint |
| Daily visitor hash bounds retention, funnels, attribution and multi-day conversion rates for anonymous traffic | Accepted in D-003; `identify()` lifts it. §16 says so per feature |
| A per-tab session record in sessionStorage could be considered storage under strict ePrivacy readings | Non-persistent, random id plus the entry referrer, same category as a CSRF token; the landing page claim is worded to match (§2). Fallback is in-memory only, which breaks sessions across same-tab reloads but nothing else |
| Backfill changes visitor, bounce, duration and referrer definitions | Expected, listed in the diff, annotated at the cutover date |
| `ua-parser-js` bundle in the function | ~60 KB, acceptable; Node runtime, not edge |
| ClickHouse Cloud vendor lock | Open-source engine, standard SQL, schema in the repo. Self-host later is a config change |
| Session queries at scale | The sort order puts a session's rows together; the `sessions` materialised view is the reserved next step |
| Trusted-IP change alters `visitor_id` for anyone behind a proxy that Vercel already handled | v2 has no production traffic yet; the change lands before any v2 row exists |
| Firewall rate limit too coarse for a site behind a corporate NAT | 600 requests per minute per IP; a per-site bucket is the Phase 1 refinement |
| `site_secret` cannot be rotated | Stated in §5.2; a compromise means re-identifying users under a new secret, which is a Phase 3 migration if ever needed |

What changes on cutover day, visibly, and needs the owner's acceptance:

1. **Visitors.** Today's headline number counts permanent browser ids. After cutover it counts
   daily-rotating hashes, so over any multi-day range it is visitor-days, and the value steps
   on cutover day. Goal conversion rate inherits the same denominator. This is D-003 made
   visible; the alternative is a permanent identifier, which D-003 rejected.
2. **Average time and bounce rate** become engagement-based and single-pageview-based
   respectively (§6.3). Both will read lower than today, and both will be right.
3. **Referrers** move from per-pageview to per-session (§7.4), so internal navigations stop
   appearing as referrers.
4. **Time series** bucket in the site's timezone (UTC until the setting is exposed in Phase 1)
   instead of the viewer's browser timezone.
5. **Performance tab** loses the JS heap card and chart (§8.4). Everything else on it survives.

Settings defaults to confirm: retention 24 months; `respect_dnt` off (GPC always honoured);
`store_user_ids` off; `store_titles` off; v1 adapter removed after 30 days with no v1 rows.

## 16. Does the schema cover the roadmap

Beyond-one-day features for anonymous traffic are bounded by D-003 and say so.

| Feature | Query shape on `events` | Needs identify()? |
|---|---|---|
| Realtime | `WHERE ts > now() - INTERVAL 5 MINUTE` (minmax index), uniq visitors, current path by `argMax(path, (ts, seq, pageview_id))` per session | no |
| Custom ranges, compare | `summary` with `compare`; `timeseries` at the requested granularity in the site timezone (§9.1) | no |
| Entry / exit pages | §6.3; as a filter via `sessionWhere` | no |
| UTM campaigns, channels | breakdown on the utm and channel columns, present on every row | no |
| Screen sizes, browser and OS versions, languages | breakdown on `screen_width × screen_height`, `browser_major`/`browser_version`, `os_version`, `language` | no |
| Saved segments, URL filters | `Filter[]` serialised (§9.3); Phase 1 table and UI | no |
| Goals | pageview goal: `countIf(path matches)`; event goal: `countIf(event='custom' AND name=?)` (bloom index on `name`); conversion rate = uniq visitors with goal / uniq visitors; Phase 2 adds the `goals` table | rate within a day: no; multi-day rate: yes |
| Revenue per goal | `props['revenue']` with `mapContains` and `toFloat64OrZero`, minor units plus `currency` prop (§7.7) | no |
| Event property breakdown | `breakdown` on `props[?]` guarded by `mapContains`; `arrayJoin(mapKeys(props))` for the key list (bloom index on keys); value distributions scan the range, which is bounded by the site and date key | no |
| Events explorer rows | `rows(ctx, 'events')` (§9.2) | no |
| Performance p75 per page | `quantileIf(0.75)(vitals['lcp'], mapContains(vitals, 'lcp'))` grouped by path; targets by `topKIf(5)(vital_targets['lcp'], mapContains(vital_targets, 'lcp'))`; the same for every legacy key (§8.4) | no |
| Public dashboards, REST API, team roles | `authorize()` seam (§9.4) plus a Postgres table each; no query change | no |
| Email digests, alerts, per-site retention | Vercel Cron calling the primitives (Phase 2) | no |
| Excluded IPs and paths | ingest (§7.2 steps 3 and 8), because the raw IP exists only there | no |
| Funnels | `windowFunnel(window_seconds)(ts, step1, step2, ...)` per visitor, then count by max level; `ts` is `DateTime` so the window is in seconds; drop-off drill-down via `rows(ctx, 'sessions')` | within a day: no; multi-day, and "who dropped" as people: yes |
| Paths | ordered path list per session, `arrayCompact` for loop collapsing, filter for exclusions (§6.3), then transition counts | no |
| Retention | `retention(cond_day0, cond_day7, ...)` per `user_hash` | yes |
| Sessions / people explorer | `rows(ctx, 'session')` ordered by `(ts, seq, pageview_id)`; per `user_hash` across days | sessions: no; people: yes |
| Attribution | first-touch: `argMin(source, ts)` per visitor before the goal; last-touch: `argMax`; session-level source is on every row already | within a day: no; multi-day: yes |
| Annotations, deploy markers | Postgres table (Phase 2), joined in the UI by date; the backfill's cutover date is its first row | no |
| Errors | `event='error'` rows, fingerprint in `props`, stack in `payload`; no schema change | no |
| Explain a change by source, page, country, device | one `breakdown` per dimension on `range` and `compare`, sorted by absolute delta; every dimension is on every row | no |
| Stripe revenue attribution | join on `user_hash` from `identify()`; no join key exists for anonymous traffic, by design | yes |
| Heatmaps, replay | out of scope; a separate click-level store, not this table | — |

Nothing in the list needs a schema change. Funnels and retention are one built-in function each.

## 17. Implementation tickets (proposed)

1. ClickHouse service, three roles and the read profile with constraints, client wrappers with
   timeouts, migration runner, `events`, `ingest_rejects` and `migrations` tables, CI `test` job
   with the service container, `verify` amended to include unit tests, CLAUDE.md rule 5 amended.
2. Identity and site registry: `site_hostnames`, `site_settings`, `visitor_salts` with `pg_cron`,
   `identified_users`, `pg_ingest_failures`, url normalisation; `hash.ts` with its test vector;
   day-keyed salt cache; trusted client IP from `x-vercel-forwarded-for` (replaces the
   TICKET-003 helper); `authorizeWebsite` returns the site id.
3. Ingest v2 endpoint: proxy matcher, gates, Origin-based site and settings resolution with
   caching, excluded IPs and paths, zod schema and the reject/suspect matrix, time bounds,
   enrichment, string caps, classification, insert with timeout, reject and failure recording,
   CORS and OPTIONS, `data-debug` responses, Vercel Firewall rule; tests.
4. v1 adapter dual-write with `pageview_id` tracking, `seq`, session-first referrer
   classification, plus `waitUntil()` via `@vercel/functions` on the existing Supabase writes.
   Record its deploy time as `--until`.
5. Query foundations: `authorize.ts`, `ranges.ts` with timezone, `sessions.ts`, the four
   primitives, the filter compiler with `sessionWhere`, `suspect` and the AND/OR rule;
   integration tests.
6. Backfill script with `--until` and `--dry-run`; run against production after ticket 4 is
   deployed; unmapped-country report.
7. Tracker v2 core: session record with storage fallbacks and namespacing, `seq`, batching per
   page with the transport contract, engagement schedule, bfcache, navigation de-duplication,
   GPC/DNT/optOut, the attribute surface; first-party serving with the hashed twin and
   `headers()`; Playwright suite including the invariant test.
8. Tracker v2 extras chunk and vitals module including navigation timing (§8.4).
9. Dual-run on Lynq's site; diff script; seven-day run; phase close-out report.

Each is one to three days. 1 to 5 are sequential; 6 depends on 4 being deployed; 7 and 8 can
start once 3 exists; 9 is last.

## Appendix A. Review outcomes

Review 1 (data layer), seventeen findings, all addressed in v2: page and session context on
every row; time bounds; trusted client IP; day-keyed salt cache and `pg_cron` cleanup; sort
order without `event`, skip indexes, no sampling; client session id as the single definition
with gap repair only within an id; bounce and duration defined once; `sessionWhere` and
session-start bucketing; `ttl_only_drop_parts`, lightweight `DELETE FROM`, mutation polling;
backfill `--until` and `waitUntil()`; day-salted legacy ids; dual-run of v1 and v2; corrected
function claims and the identify() column in §16; `DateTime`, `LowCardinality` country,
`String` versions, `browser_major`; `user_hash` with opt-in raw ids; `wait_for_async_insert = 1`,
inline error rows, three roles; backfill approximations stated.

Review 2 (ingest, tracker, privacy, operations), sixteen findings, all addressed in v3: proxy
matcher exclusions; site from `Origin`, size gate before parsing, `suspect` column, Vercel
Firewall rule; exact hostname matching with `site_hostnames`, url normalisation, negative
caching; client timeout and `maxDuration`, idle-scaling stance; CORS headers, `text/plain`
contract, 8 KB batches, `sendBeacon` fallback; engagement schedule without a periodic beacon;
`store_titles` default off, string caps, control-character stripping, no
`dangerouslySetInnerHTML`; session-lifetime `seq` and the batch sealing invariant; honest
browser-storage wording, try/catch storage, sessionStorage clone instead of BroadcastChannel;
`pageshow` for bfcache; GPC honoured unconditionally, `@` heuristic dropped; reject counts by
hostname and `data-debug`; realistic budgets with an extras chunk, navigation de-duplication;
direct script serving with a hashed twin and SRI, frozen v1 repo; split CI jobs, unit-only
`verify`, local recorder, invariant test; `readonly = 2` with constraints, `@vercel/functions`,
drop-not-clamp, `x-vercel-forwarded-for`, `site_id` narrowing.

Review 3 (consistency, implementability, roadmap coverage, Phase 1 reproduction), all
addressed in v4: the time-bound rule no longer rewrites or flags normal rows (§7.2 step 7);
the opt-out flag named and the privacy claim re-worded (§2, §5.1, §8.2); the session record's
real contents stated (§6.1); the example payload's engagement row is a piggyback (§7.1);
generators corrected in §4.1; insert failures recorded outside ClickHouse (§4.2); `respect_dnt`
became a snippet attribute (§8.1); annotations deferred honestly (§10, §16); `user_id` moved to
Postgres with a `pg_cron` expiry instead of a column TTL (§5.2, §4.2); `pageview_id` added to
the order and to every tie-break (§4, §6.3); `?debug=1` gated on a registered Origin (§7.9);
`sessionWhere` keys on `(visitor_id, session_id)` (§9.3); DDL for every supporting table
(§4.2); hash byte order fixed with a shared implementation (§5.1); reject/suspect matrix
(§7.2); adapter `pageview_id`, `seq`, session hash and referrer rules (§7.11); backfill
orphans, `'Unknown'`, dry-run, batching, and its dependency on ticket 4 (§10, §17); ranges,
granularity, timezone, compare, `limit`, entry/exit as session dimensions, the AND/OR rule, and
a fourth `rows` primitive (§9); `authorize()` seam for keys, share tokens and membership (§9.4);
`screen_height` and `payload` columns (§4); excluded IPs and paths at ingest (§7.2); vitals
module keeps navigation timing and TBT so the Performance tab survives, JS heap retired (§8.4);
firewall threshold and read-profile values named (§7.8, §14); `site_secret` non-rotatable
(§5.2); `headers()` for the script (§8.1); close evidence instead of "required to merge" (§13);
the diff reads Supabase directly and names its visitor definition (§11); the five visible
cutover changes listed for the owner (§15).
