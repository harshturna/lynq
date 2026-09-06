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

## D-010 — Overview tables rank one metric with a share bar; changes in a fixed slot; teal lead line
- **Status:** Accepted
- **Date:** 2026-09-05
- **Context:** The Overview as built under D-008 put four metrics and four deltas in each
  half-width table, with every delta glued to its number in the same cell. On the seeded site
  the owner found it unreadable ("numbers don't align, it's so hard to read"). An audit
  (https://claude.ai/code/artifact/8731fb9c-c34f-4b2c-b417-2ae5a3280ba0) showed the fault was
  the column count, not the delta placement; three delta-placement variants were rejected
  as still congested. The lead chart's sharp ink polyline with a dotted compare crossing it
  was called ugly.
- **Decision:** An Overview table ranks one metric: label, one right-aligned number, and a
  fixed change slot when compare is on. A quiet share bar (teal-soft) sits behind the label,
  scaled to the top row, so the ranking reads before the numbers do; this amends D-008's
  "no share bars" line for ranked lists only. "Details" opens the full drawer with every
  column; the section screens keep full tables. In every table the change never shares a
  cell with its number: it sits in a 64 px slot, 11.5 px, mute text, only the triangle
  coloured; rates change in points; a missing previous value reads "—". A table's view tabs
  underline on the table's top rule, as the top navigation does. The lead line is teal with
  a vertical gradient fill, smoothed, the previous period drawn behind it as a thin solid
  grey line, the last point marked.
- **Rejected alternatives:** Deltas in their own column beside every number, deltas stacked
  under the number, and a "change on the sorted column only" toggle: all three keep four
  numeric columns in 560 px and were rejected by the owner as congested. Keeping the ink
  line with a gentler curve: the owner preferred the teal treatment.
- **Consequences:** The Overview reads as three ranked lists; anyone wanting bounce or
  engaged time per page goes to Details or the Pages screen, one click away. The share bar
  costs nothing in queries (share of the top row). The accent now doubles as the series
  colour, so accent-coloured controls near a chart must stay clearly control-shaped. D-008
  otherwise stands.

## D-011 — The Pages lead view is an attention line, not a treemap
- **Status:** Accepted
- **Date:** 2026-09-06
- **Context:** The treemap chosen in §7 and §8.3 of the Phase 1 design (D-009's inventory)
  read as messy in use: truncated titles in small cells, two numbers per cell, an "everything
  else" block, rounded tiles unlike anything else on the light base. The owner rejected it
  and asked for a calmer screen. Ranked shaded bars were mocked and rejected because they
  repeat the table directly below.
- **Decision:** The Pages screen opens on one line: a split bar of pageviews across the top
  six pages plus "N other pages" (the Devices `SplitBar`), and a sentence with what the
  table does not show at a glance, the top three pages' share and where engaged time is
  longest and shortest. The treemap code, its threshold and its ECharts registration are
  removed; the table remains the accessible equivalent and the full list.
- **Rejected alternatives:** a tidied treemap (top 8, one number per cell, square corners):
  still a second layout language on the screen. Ranked shaded bars: a picture of the table
  above the table. Opening the top page's panel by default: busier, and it reads as a click
  the user did not make. Dropping the lead view altogether: the screen then rests on a bare
  table; the owner asked for something that earns the space.
- **Consequences:** Easier: one fewer chart type, no width threshold on Pages, the screen is
  ~180 px shorter and every label is a full path. Harder: Phase 2's Sankey-style paths view
  (§9.6) no longer has a treemap to grow out of; the design doc's §7 table and §8.3 are
  superseded on this row and are not rewritten.

## D-012 — The Sources screen has no lead view
- **Status:** Accepted
- **Date:** 2026-09-06
- **Context:** The quadrant of §7 and §8.4 (visitors on a log axis, conversion up, bubble
  size revenue, four corner labels) read as dated and noisy: dotted crosshairs, hollow
  bubbles, colliding labels. The owner rejected it outright.
- **Decision:** Nothing replaces it. The screen is the summary strip, then the tables.
- **Rejected alternatives:** a dot plot of conversion against the site average per source
  (the Goals form): a clean chart, but the owner did not want a chart there. Three standouts
  in words (scale, fix, watch): too opinionated on thin data. A stripped scatter: sixteen
  sources pile up on the left because two are ten times bigger. A channel split line with a
  sentence: its bar repeats the Channels table's Share column directly below it.
- **Consequences:** Easier: a shorter screen and one fewer chart type; the ECharts graphic
  component is no longer registered. Harder: "where to spend the next hour" is answered by
  the tables' conversion and revenue columns, which the table redesign (D-013) must keep
  legible.

## D-013 — The data table is rebuilt: left-hugging, one primary column, bar in a column
- **Status:** Accepted
- **Date:** 2026-09-06
- **Context:** Every screen's tables were hard to read: the label column stretched to the
  container so a label and its number sat half a screen apart; every header was a sort
  button and every row carried a coloured change, a sparkline or a dot; the D-010 share bar
  was a tint behind the label that read as highlighted rows. The owner asked for the table
  itself to be rethought, not for a different assignment of tables to screens.
- **Decision:** One table component with these rules. The table hugs the left and ends where
  its columns end; the label column is 220 to 320 px (half-width tables fill their column).
  One primary column: the sorted metric, in ink at medium weight, with the only dark header
  and the only change slot; the other numeric columns are ink-2 and plain, at most four in
  all. The share bar, where a table has one, is a 6 px bar in its own column right after the
  label. Change is 12 px mute text with a small coloured caret, right-aligned. Headers are
  words; the sort caret shows only on the sorted column. Rows are 40 px with hairlines and a
  hover tint. No sparkline columns and no per-cell dots; status is a pill in its own slot,
  only where it is not good. What a table no longer shows stays in the row's panel, the
  Show-all drawer and the CSV. Not everything is a table: a share question with few rows is
  a split bar or a bar list; a fact the tables cannot give at a glance is a sentence.
  This amends D-010's table rules; D-010's chart rules stand.
- **Rejected alternatives:** applying D-010's one-metric form everywhere with a metric
  switcher: every screen would look the same, and the fault was the table's own design.
  Keeping wide tables and only cutting columns: still the far-apart label and number.
- **Consequences:** Easier: one component, one rhythm across ranked and regular tables;
  screens differ by which columns they show, not by how a table looks. Harder: every screen
  is touched once more (TICKET-054 onward); the Overview's D-010 tables are rebuilt on the
  new form.

## D-014 — The landing page stages the product inside panels, on the light base
- **Status:** Accepted
- **Date:** 2026-09-06
- **Context:** The landing page was dark, gradient-text and Poppins while the product had
  become light, Geist and teal; the two no longer looked like one thing. Four rounds of
  mocks: a section-per-feature page with small product fragments in boxes (rejected as
  cheap), full-page screenshots of the app (rejected as lazy), hand-drawn hairline diagrams
  (rejected as generated-looking), and finally the pattern the well-regarded product pages
  share (Attio, Vercel, Cursor, Stripe, Linear): real product UI staged as an object inside
  a soft rounded panel, oversized and bleeding off the panel's edge, with one secondary
  element lifted over it, beside a short two-tone sentence.
- **Decision:** Light only, the app's tokens and Geist. Hero: left headline with one
  highlighted phrase, two buttons, three reassurances, a live visitor count, and the ranked
  Pages table as the product fragment with one row lifted. A band under the hero draws the
  demo site's last 30 days. Then staged panels for the Overview, Filters, Performance and
  Realtime; the privacy ledger (one pageview as stored, and what is never stored); four
  true numbers on one rule; three setup steps beside the onboarding's check list; a
  two-line close. Copy is plain and declarative; every line says what the reader gets.
- **Rejected alternatives:** the three above; a dark hero with a 3D object (needs an artist
  and hands the visitor a light app one click later); logo rows, testimonials and ratings
  (nothing true to put there yet); a dotted world map (a separate asset, maybe later).
- **Consequences:** Easier: the landing page and the product share one look and one
  component vocabulary; the panels are presentational React in the app's tokens, so they
  follow the tokens. Harder: the panels' contents are fixed demo numbers and must be kept
  believable by hand; the hero band and live count depend on the demo site existing.

## D-015 — A per-day rollup serves every unfiltered breakdown; raw rows fill the edges
- **Status:** Accepted
- **Date:** 2026-09-06
- **Context:** TICKET-049. At twelve months on the seeded site (183k rows) the multi-metric
  breakdowns take 1.3 to 1.7 s warm and 7 s cold: the session CTE reads every row of the
  range through the (site, visitor, session) index, the metrics join back to the rows once
  per session, and with 2 MB of work_mem every sort spills to disk. The Overview runs
  sixteen of these on a four-connection pool, so the 1.5 s statement budget (§9) failed at
  90 days and the timeout was raised to 5 s as an interim. D-006 named rollup tables as the
  first scaling lever.
- **Decision:** `analytics.rollup_daily(site_id, day, dimension, value, sums)`: one row per
  UTC day, dimension and value, holding distinct anonymous visitors, pageviews, custom
  events, sessions, bounced sessions and the summed engaged, pageview and time-on-site
  counts. Thirteen dimensions: path, entry_path, exit_path, the eight entry attributions,
  country, region, city, device, browser, os. One SQL function,
  `analytics.rollup_window(site, dimension, from, to, identified_only)`, holds the session
  definition (§6.3) in SQL; housekeeping calls it per day to fill the table through two days
  ago (client timestamps may trail receipt by 24 h), and the read path calls it for the
  partial UTC days at either end of a range and for whatever housekeeping has not reached.
  Anonymous visitor ids rotate per UTC day (D-003), so daily distinct counts sum exactly;
  identified users keep one id, so their distinct count is taken from the raw rows over
  the whole range through a partial index on `user_hash <> 0` and added. Goal columns
  come from the goal-matching rows alone: those sessions are sparse, so they are fetched
  through the session index rather than a range scan. The rollup serves every unfiltered
  single-dimension breakdown whose range holds at least one full UTC day; a filter, a
  property dimension, a two-dimension matrix, revenue, last-seen or suspect rows fall back
  to the events scan.
- **Rejected alternatives:** A larger compute size, rejected because the cost is the row
  count, not the plan, and it grows with every site. Materialised views per dimension,
  rejected because a refresh recomputes the whole history and cannot serve the partial
  days. A rollup only for ranges over N days, rejected because for identified sites the
  numbers would step at N; one definition for all unfiltered reads is easier to reason
  about and the short ranges get faster too. Approximate visitors (HLL, or identified users
  counted once per day), rejected because a logged-in user who visits daily would count
  365 times over a year.
- **Consequences:** Easier: long ranges read tens of rows per day per dimension; the
  statement timeout returns to 1.5 s; housekeeping is the one refresh path and a missed
  night costs only a longer raw tail. Harder: two definitions of a session metric exist
  (the TypeScript CTE for filtered reads, the SQL function for unfiltered reads) and an
  integration test pins them equal; an identified session that crosses UTC midnight counts
  twice on the rollup side; a new dimension needs a column in the function and a backfill.

## D-016 — Attention, read-through and influence, and how each is defined
- **Status:** Accepted
- **Date:** 2026-09-06
- **Context:** TICKET-080 adds a second reading of rows Lynq already stores, so that the Pages
  screen can answer which page holds people and which page helps them convert. The definitions
  become the product's vocabulary and appear in the UI and the docs, so renaming or redefining
  them later is expensive. Each was measured on the seeded production site before being fixed.
- **Decision:** **Attention** is the engaged milliseconds a page accumulated in the range, shown
  in minutes, with attention share as its portion of the site; it is a total and is distinct from
  the existing Engaged time, which stays an average per session. **Read-through** is the share of
  a page's pageviews whose deepest scroll reached 75% of the document with at least 10 seconds of
  engaged time, the same floor as bounce, shown only above 30 pageviews. **Influence** is the
  ratio of the KPI goal's conversion rate among sessions that saw the page to the rate among
  sessions that did not, crediting a page only when it was seen **before** the session's first
  completion, shown only when both sides have at least 50 sessions, and described in the UI as
  association rather than cause.
- **Rejected alternatives:** Crediting every page a converting session saw, rejected on evidence:
  it puts the post-signup `/dashboard` top at 3.16× and buries `/pricing`, because reaching the
  dashboard is a consequence of converting. Read-through at 100% of the document, rejected as
  almost nobody reaches the last pixel. Read-through per session rather than per pageview,
  rejected because a return visit is a second chance to read. Reusing the existing Engaged time
  as the ranking metric, rejected because an average per session cannot rank pages by how much
  attention they hold in total.
- **Consequences:** Easier: the Pages screen answers a question no cookieless competitor answers,
  with no new collection and no privacy change; the definitions are written once and cited by the
  UI and the docs. Harder: three more definitions to keep true, minimum thresholds that must be
  explained wherever an em dash appears, and a metric (influence) that people will read as
  causal however it is labelled.

## D-017 — Per-site API keys: hashed at rest, scoped, revocable
- **Status:** Accepted
- **Date:** 2026-09-06
- **Context:** Three planned features need something that is not a browser to prove which site it
  is: a server-side middleware reporting crawler hits (TICKET-075), a deploy pipeline writing a
  note (TICKET-076), and an agent reading a site's analytics over MCP (TICKET-078). The browser
  tracker deliberately has no secret, because a secret in a public script is theatre and the
  hostname gate is enough for public behaviour. Each of the three tickets carried the same
  undecided sub-step, so it is decided once here.
- **Decision:** Keys are called **API keys** and belong to one site. A token is
  `lynq_sk_` followed by 48 hex characters from 24 random bytes; only its SHA-256 hash is stored,
  in `analytics.api_keys`, alongside a 16-character display prefix, a name, its scopes, and
  created, last-used and revoked timestamps. The token is shown once at creation and never again.
  Three scopes, because the uses differ in risk: `ingest` writes events from a server, `notes`
  writes annotations, `read` reads analytics. A key carries the scopes chosen at creation and
  cannot be edited; a wrong key is revoked and replaced. Authentication is an
  `Authorization: Bearer` header; a key is never accepted on a request carrying a browser Origin
  for the site, so a leaked key cannot be replayed from a page. Revocation is immediate and a
  revoked row is kept for the audit trail rather than deleted.
- **Rejected alternatives:** One unscoped key per site, rejected because reading a site's
  analytics and appending a note are not the same risk and a single key forces the highest.
  Storing the token in plain text so it can be shown again, rejected because the point of hashing
  is that a database leak is not a key leak; showing it once is the standard trade. Signed
  requests instead of a bearer token, rejected as much harder for a shell script or a middleware
  to produce, for a threat this does not face. Reusing the Supabase session, rejected because
  none of the three callers has one.
- **Consequences:** Easier: three tickets are unblocked with one shape between them, and each
  endpoint declares the scope it needs. Harder: a lost key cannot be recovered, only replaced,
  which has to be said plainly in the UI and the docs; scopes are one more thing to get right at
  creation; and every keyed endpoint must check the scope rather than merely that the key exists.


## D-018 — Bot traffic: only classified crawlers are reported, from a documented snippet
- **Status:** Accepted
- **Date:** 2026-09-06
- **Context:** TICKET-075 adds a server-side reporter, because crawlers never run the browser
  tracker. As filed, the ticket also had that reporter count every human request by route and
  status, and assumed a published npm package. Writing the design (`docs/design/bot-traffic.md`)
  showed the first would collect from people who opted out, and the second is a release process
  for thirty lines of code. Owner confirmed both recommendations on 2026-09-06.
- **Decision:** The middleware reports **only requests Lynq classifies as a bot**. A request from
  a person is never sent, so a visitor who opted out with `lynq.optOut()` or who sends Global
  Privacy Control stays invisible on this path too, and the privacy page stays true. Crawler hits
  are stored in their own daily counter (`analytics.crawler_days`), never in `analytics.events`,
  so no visitor number moves because a crawler visited. Classification happens at the collector,
  so a crawler that appears after a customer installs is not missed until they upgrade. The
  reporter ships as a **copy-paste middleware snippet in the docs**, one per framework, the way
  the tracking snippet does; a published `@lynq/next` waits until someone asks for it.
- **Rejected alternatives:** Server-side analytics for humans on the same path, rejected because
  it would count people the tracker deliberately does not, and any such feature needs its own
  consent story before it exists. An npm package first, rejected as an account, releases and a
  support surface for code that fits in a doc page, with nothing about the endpoint or the table
  changing when a package is published later. Storing one row per hit, rejected because a crawl
  of ten thousand pages would be ten thousand rows per hour instead of per day, for a screen that
  only ever shows daily counts.
- **Consequences:** Easier: the privacy promise is unchanged and the docs can say so in one line;
  the endpoint, the table and the screen are small; a package can come later without a migration.
  Harder: a crawler is what its user agent claims, since v1 does no reverse-DNS check, and the
  docs must say so; and anyone who wants server-side request counts for humans gets a "no" until
  a separate decision is taken.
