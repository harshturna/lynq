# Decisions

Append-only. Record only choices that are expensive to reverse or whose reasoning would be
confusing to rediscover. Routine implementation choices live in the ticket that made them.
Accepted decisions are immutable except for their status and a pointer to a superseding decision.

## Entry format

```markdown
## D-NNN — Short title
- **Status:** Accepted | Rejected | Superseded by D-NNN
- **Date:** YYYY-MM-DD
- **Context:** what forced the choice
- **Decision:** what was chosen
- **Rejected alternatives:** what else was considered and why it lost
- **Consequences:** what becomes easier and harder
```

## D-001 — Quality of existing features first, then UI overhaul, then new features
- **Status:** Accepted
- **Date:** 2026-09-05
- **Context:** The revamp has three tracks. The review found the data path caps at 5,000 rows,
  two security holes, and several headline metrics built on unreliable signals. Both the UI and
  every new feature depend on a query layer that does not exist yet.
- **Decision:** Fix what leaks or lies on the current code, then rebuild the data layer and rewire
  the existing screens to it with no visual change. UI shell second. New features last.
- **Rejected alternatives:** UI first, rejected because a new UI on the current server actions
  still shows wrong numbers and gets rebuilt when the query layer lands. Features first, rejected
  because funnels and retention cannot be expressed on fetch-raw-rows-and-reduce-in-JS.
- **Consequences:** Nothing visible ships for the first few weeks. Every later feature is a query
  plus a screen inside a shell that already exists.

## D-002 — ClickHouse for events, Supabase Postgres for metadata
- **Status:** Superseded by D-006
- **Date:** 2026-09-05
- **Context:** Funnels, paths, retention, p75 vitals, and realtime all need columnar scans over
  events. Postgres with Timescale would work to roughly 10 to 20 million events and then require
  the same migration under load.
- **Decision:** One wide `events` table in ClickHouse, materialised views for rollups and sessions.
  Supabase keeps auth, sites, teams, goals, segments, dashboards, annotations, alerts, API keys.
- **Rejected alternatives:** Postgres plus TimescaleDB, rejected because migrating later means
  writing every query twice. Keeping the current five-table Supabase schema, rejected because it
  cannot pre-aggregate and its custom events are one row per property.
- **Consequences:** Multi-tenancy is enforced in the query layer rather than by RLS. One more system
  to operate. Every analytics query is written once against the final store.

## D-003 — Cookieless identity by default, identified users opt-in
- **Status:** Accepted
- **Date:** 2026-09-05
- **Context:** The tracker stores a permanent UUID in localStorage while the landing page claims
  cookie-free, privacy-first tracking. A persistent identifier needs consent under GDPR and
  ePrivacy, so the claim is currently false.
- **Decision:** Visitor id is a daily-rotating salted hash of IP, user agent, and site, computed at
  ingest. `lynq.identify()` opts a site into stable ids for logged-in users.
- **Rejected alternatives:** Keep the localStorage UUID and add a consent banner requirement,
  rejected because it removes the product's main differentiator against GA4.
- **Consequences:** Retention and returning-visitor metrics are limited to within a day for
  anonymous visitors, as with Plausible and Fathom. No consent banner needed in default mode.

## D-004 — Phase 0 design v4 is the plan, including the five visible cutover changes
- **Status:** Accepted
- **Date:** 2026-09-05
- **Context:** `docs/design/phase-0-data-foundation.md` v4, after three adversarial reviews
  (44 findings folded in), was presented to the owner with the five things that change
  visibly on cutover: Visitors becomes visitor-days over multi-day ranges and steps down on
  cutover day; average time and bounce rate become engagement-based and single-pageview-based
  and read lower; referrers become per-session; time series bucket in the site timezone, not
  the viewer's; the Performance tab loses the JS heap card.
- **Decision:** Build Phase 0 as designed in v4. The five changes are accepted as consequences
  of D-003 and of correct definitions, not regressions. Implementation follows the nine tickets
  in §17 of the design (TICKET-012 to TICKET-020).
- **Rejected alternatives:** A permanent visitor identifier to keep the Visitors number
  continuous, rejected by D-003. Keeping the JS heap metrics, rejected because they are
  Chrome-only, non-standard and not a performance signal. Keeping viewer-timezone bucketing,
  rejected because a shared dashboard would show different numbers to different viewers.
- **Consequences:** Phase 1 must explain the cutover step change in the UI (an annotation on
  the cutover date). The design document is the reference for every Phase 0 ticket; changes to
  it go through a new decision or a ticket's progress log depending on size.

## D-005 — Privacy and retention defaults for tracker v2 and the event store
- **Status:** Accepted
- **Date:** 2026-09-05
- **Context:** The design leaves five defaults to the owner (§15). Each is cheap to change per
  site later but expensive to change as a default once sites exist.
- **Decision:** Retention 24 months (table TTL). Global Privacy Control is honoured
  unconditionally with no per-site switch: it forces anonymous mode. Do Not Track is honoured
  only when the snippet carries `data-respect-dnt`, default off. `store_user_ids` off: raw ids
  live in Postgres for 90 days only when a site opts in; ClickHouse only ever holds the hash.
  `store_titles` off. The v1 adapter and the v1 script URL are removed after 30 consecutive days
  with no v1 rows, and the landing-page privacy copy changes at that point.
- **Rejected alternatives:** A per-site switch for GPC, rejected because ignoring a recognised
  legal opt-out would make Lynq the processor that facilitated it. Storing raw user ids by
  default, rejected because customers will send email addresses. Storing page titles by
  default, rejected because search pages and logged-in apps put user content in them.
- **Consequences:** Retention, funnels and attribution beyond one day need `identify()`. Sites
  that want DNT honoured must add an attribute to their snippet. Some customers will ask for
  titles and raw ids and will find a switch in settings.

## D-006 — Events stay in Supabase Postgres; ClickHouse is the exit ramp, not the start
- **Status:** Accepted
- **Date:** 2026-09-05
- **Context:** D-002 chose ClickHouse for the scale and ad-hoc flexibility a many-tenant product
  needs. The owner's horizon for the next six months is a few sites, shipped fast, with the
  fewest moving parts, and no feature compromise. At that scale Postgres handles the workload,
  and every roadmap feature is expressible in SQL (window functions and array aggregates in
  place of ClickHouse's one-line funnel and retention functions).
- **Decision:** Events live in a dedicated `analytics` schema in the existing Supabase Postgres:
  one wide `events` table, monthly range partitions, the same row shape as the ClickHouse
  design, JSONB for props and vitals. The query layer (`lib/query`) stays the only place with
  SQL and the only tenant boundary for analytics reads, so the store can be swapped behind it.
  Rollup tables are the first scaling lever; ClickHouse is the second, taken when a site's
  raw-event queries exceed budget, expected somewhere past ten million events a year.
- **Rejected alternatives:** ClickHouse now (D-002), rejected for operational cost at a scale
  that does not need it. Postgres plus TimescaleDB, rejected because Supabase's Timescale
  support is limited to the community edition without compression, which removes most of its
  value; native partitioning plus pg_cron covers what Phase 0 needs.
- **Consequences:** One system to operate; RLS stays available on the app tables; migrations
  stay in `supabase/migrations`. Count distinct is exact and costs a scan; funnel, path and
  retention queries are hand-written SQL. Disk grows roughly 40 GB per 100M events with no
  columnar compression, so the Supabase plan and the retention default matter earlier than
  they would have. The design document is revised to v5 for Postgres; the wide row, the client
  session id, the envelope, the ingest pipeline, the tracker and the backfill are unchanged.

## D-007 — Retire v1 immediately, once the dashboard reads the new store
- **Status:** Accepted
- **Date:** 2026-09-05
- **Context:** D-005 kept the v1 adapter and script for 30 quiet days after the last v1 row.
  With Phase 0 complete the owner sees no value in the wait. The one dependency is that the
  current dashboard still reads the old tables; removing the v1 route before the dashboard is
  rewired would freeze what it shows.
- **Decision:** Phase 1 opens with the dashboard rewired to `lib/query` with no visual change
  (TICKET-023), then v1 is removed in full (TICKET-024): the snippet on Lynq's site, `/api/lynq`,
  the adapter, the old-table write path, and the old tables themselves after an export. The
  30-day clause of D-005 is superseded; its other defaults stand. The landing-page privacy copy
  changes when TICKET-024 lands. Any site still carrying the v1 script (aivia.byharsh.com
  today) stops being tracked until it installs the v2 snippet.
- **Rejected alternatives:** Keeping `/api/lynq` alive for stragglers, rejected as ceremony for
  a portfolio project with one external install the owner controls.
- **Consequences:** Two small tickets before the UI overhaul proper. The demo dashboard shows
  Lynq's own traffic as soon as TICKET-023 ships.

## D-008 — Visual direction for the UI overhaul: light, Ledger-style, teal accent
- **Status:** Accepted
- **Date:** 2026-09-05
- **Context:** The current dashboard is dark-only with a cyan accent and a page of cards. The
  owner wants the whole UI replaced with a light theme and asked for mockups before any design
  writing. Four directions were mocked on one page (Sentry-derived, "Ledger", "Studio",
  "Console", then a Ledger + Studio hybrid) and reviewed live:
  https://claude.ai/code/artifact/25f864fe-6a61-480a-965e-c3404eb7657f. The owner rejected the
  Sentry-derived look, chose the hybrid, rejected a purple accent as not tasteful, and asked for
  the Studio layer toned down.
- **Decision:** The product UI is light-only and built on the "Ledger + Studio" hybrid as
  finally mocked: white page, near-black type (Geist), rules instead of borders and shadows,
  top navigation, real tables for breakdowns, one thin black trend line with the previous
  period dotted, teal `#0f766e` as the single accent (active tab and tile underline, selected
  rows, links, faint area under the line), semantic green, amber and red kept separate from the
  accent. From Studio, only: delta badges on the KPI tiles, flags on countries, a goal card with
  progress bar and funnel, a devices split bar, status pills on Web Vitals. Not carried:
  sparklines on tiles, share bars inside tables, coloured filter chips, purple or indigo
  anywhere, sidebar navigation, card grids.
- **Rejected alternatives:** Sentry-derived light theme (Rubik, ink-violet, uppercase labels),
  rejected by the owner on sight. Studio alone (warm off-white, rounded panels, bold indigo),
  rejected as too much. Console (dense grid, mono numbers), not chosen. Keeping a dark theme or
  a theme toggle, out of scope: light only for now. Accents blue, emerald, coral, violet, steel,
  forest, ochre and none, all shown; teal chosen.
- **Consequences:** TICKET-025 writes the design from these tokens and mocks the remaining
  screens in this style before implementation tickets open. The existing dark theme, cyan
  accent, globe card and card-grid layout go away with the overhaul. A dark theme, if ever
  wanted, is a later decision, not a token swap.

## D-009 — Charts through Apache ECharts
- **Status:** Accepted
- **Date:** 2026-09-05
- **Context:** The Phase 1 design (docs/design/phase-1-ui-overhaul.md §7, §14) needs line, bar,
  sparkline, treemap, scatter with bubbles, heatmap, histogram and dot plot now, and a Sankey
  for Phase 2's paths. The mockups were drawn as hand-written SVG and the v3 design proposed
  keeping that; the owner rejected it ("let's not do hand-written charts, we should use
  library"). Recharts is in the project today for line charts only.
- **Decision:** Apache ECharts is the one chart library: `echarts/core` with only the needed
  chart types and components, the SVG renderer, one `lynq` theme generated from the design
  tokens, one `<Chart>` client component that owns the instance, and a pure option builder per
  chart kind. Every chart keeps a table equivalent (design rule 8) as the keyboard and
  screen-reader path. Recharts and `components/ui/chart.tsx` are removed with the old
  dashboard.
- **Rejected alternatives:** Hand-written SVG React components (owner's call). Nivo, the
  second choice: server-renderable SVG and React-native components, but weaker interaction and
  accessibility, heavier overlapping d3 packages, and no Sankey of ECharts' quality for the
  paths screen. Recharts 3: no heatmap or dot plot without faking them, and its animation
  caught screenshots mid-draw. visx: primitives, which is hand-writing with a dependency.
- **Consequences:** Charts render after hydration into fixed-height skeletons rather than in
  the server HTML. Roughly 200 KB gzipped of chart code, loaded once through a dynamic import
  and measured against a 220 KB budget. Marks are not focusable; the table equivalent is the
  accessible representation and must exist for every chart. Phase 2's paths view gets ECharts
  `sankey` without a second library.
