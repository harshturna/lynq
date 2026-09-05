# Phase 1 design: the app shell and every screen

Version 1, 2026-09-05. Owner: harsh. Status: draft for review (TICKET-025).

Phase 1 replaces the dashboard UI. It keeps the data layer built in Phase 0 and adds only the
query primitives each screen needs. Visual direction is settled: D-008. This document turns the
approved mockups into something an implementation ticket can be written from.

- Approved overview mockup: https://claude.ai/code/artifact/25f864fe-6a61-480a-965e-c3404eb7657f
  (tab "Ledger + Studio", accent Teal).
- Approved screen mockups: https://claude.ai/code/artifact/6b345ac7-a975-478b-8796-2153c3b37bf4.
- Roadmap: https://claude.ai/code/artifact/7b3f2d2c-4229-4642-b71e-6d94b75a7563.

## 1. Scope

In: design tokens and the Tailwind setup; the shell (top navigation, page header, controls);
URL state; the Overview, Realtime, Pages, Sources, Locations, Devices, Events, Goals,
Performance and Settings screens; onboarding for a new site; the sites list; loading, empty
and error states; responsive behaviour; the query primitives and schema those screens need;
the charting decision; the sequence of implementation tickets.

Out: the landing page (owner, 2026-09-05: "we can do that later as it'll need some graphics");
Phase 2 features (funnels as a product, paths, retention, people, alerts, notes, bot traffic,
MCP); a dark theme (D-008: light only); teams and roles; public dashboards and email digests
(roadmap Tier 1 "Sharing", scheduled after the screens exist).

## 2. Direction, restated as rules

From D-008 and the mockup reviews:

1. White page, near-black type, rules instead of borders and shadows. A card is the exception,
   used for the onboarding status and nothing else.
2. One accent, teal `#0f766e`, and it means "selected, active or a link". It never decorates.
3. Semantic colour is only for status: good, needs work, poor; up, down. Badges and pills carry
   it. Nothing else is green, amber or red.
4. Personality comes from data: delta badges, flags, a goal card, a devices split, a treemap,
   a quadrant, a heatmap. Not from illustration, gradients or rounded panels.
5. Every screen leads with the view its data has a shape for, then the table. The same three
   tables on every page was the failure mode the owner named.
6. Tables are real tables: sortable columns, right-aligned numbers, tabular numerals, a
   segmented caption for the view (Top / Entry / Exit), a footer with the count and Show all.
7. Everything is a filter. A row, a treemap cell, a bubble, a heatmap row adds a chip. Chips
   live in the URL, so every view is a link.
8. Light only. No toggle.

## 3. Tokens

CSS custom properties on `:root` in `app/globals.css`, mapped into Tailwind's theme so classes
like `bg-canvas`, `text-mute`, `border-rule` and `text-accent-ink` exist. The current HSL
shadcn variables and `darkMode: ["class"]` go; the shadcn components that stay are restyled
on the new tokens.

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#ffffff` | page |
| `--soft` | `#f5f5f7` | segmented control track, chips, code blocks, hover rows |
| `--soft-2` | `#ececf0` | pressed / toggle track |
| `--ink` | `#0a0a0a` | headings, primary numbers, first table column |
| `--ink-2` | `#4a4a52` | body and table cells |
| `--mute` | `#8a8a93` | labels, captions, table headers |
| `--faint` | `#b4b4bc` | tertiary text, inactive sparklines |
| `--rule` | `#e8e8ec` | table row rules, section rules |
| `--rule-strong` | `#111111` | the one heavy rule above a section, the nav bottom border |
| `--accent` | `#0f766e` | selection underline, active tab, links, chart primary series |
| `--accent-ink` | `#0b5f59` | link text on white |
| `--accent-soft` | `#e3f1ef` | selected row background, active nav |
| `--accent-bar` | `#e6f2f0` | share bars behind a row |
| `--accent-2` / `--accent-3` | `#7fbdb6` / `#cfe6e2` | second and third series (device split, stacked) |
| `--good` / `--good-soft` | `#0f7b3e` / `#e1f3e8` | up, Good |
| `--warn` / `--warn-soft` | `#a36a00` / `#fbefd2` | Needs work |
| `--poor` / `--poor-soft` | `#c7261f` / `#fbe4e2` | down, Poor, danger |
| `--compare` | `#8a8a93` dotted 1.5 3 | previous-period line |

Type: Geist 400 / 500 / 600 from Google Fonts (`next/font/google`), `font-variant-numeric:
tabular-nums` on every numeric cell and KPI. Satoshi and the heading font are removed. Scale:
26 / 500 page title, 30 / 500 KPI number, 14 / 500 section title, 13.5 body, 13 table, 12
labels, 11.5 badges and table headers. Radii: 4 for small controls and chips, 6 for buttons and
inputs, 8 for the onboarding card, 999 for badges and pills. No shadows except the segmented
control's active thumb (`0 1px 2px rgba(0,0,0,0.12)`).

Chart palette: series 1 `--ink` (trend line on Overview and Realtime), series 2 `--accent`
(selected entity's line, bars), previous period `--compare` dotted, fills at 4.5% opacity of
the accent, heatmap and treemap ramps from `rgba(15,118,110,0.04)` to `0.8`, histogram bands
in the semantic colours. Gridlines `--rule`. Axis text `--mute` 11px.

## 4. Information architecture and routes

```
/dashboard                 sites list (existing route, restyled)
/sites/new                 onboarding: install, wait for first event, pick a KPI
/[site]                    Overview
/[site]/realtime
/[site]/pages
/[site]/sources
/[site]/locations
/[site]/devices
/[site]/events
/[site]/goals
/[site]/performance
/[site]/settings           one scrolling page with an in-page sub-nav
```

`[site]` stays the slug column on `public.websites`. Top navigation lists the nine screens in
that order; Settings sits on the right beside the site switcher and the account avatar. The
Overview's KPI tiles link into Pages, Sources and so on where a tile has a natural home.

## 5. URL state

Everything that changes what the screen shows lives in the query string, so the back button,
reload and sharing all work and the server renders the right thing on first load.

| Param | Values | Default |
|---|---|---|
| `range` | `last_24h` `last_7d` `last_30d` `last_90d` `last_12mo` `today` `yesterday` `this_week` `this_month` or `YYYY-MM-DD,YYYY-MM-DD` | `last_30d` |
| `compare` | `previous_period` `previous_year` `none` | `previous_period` |
| `f` | repeated; `dimension:op:value` with `op` in `is` `is_not` `contains`; several values joined with `\|`; value URL-encoded | none |
| `view` | the segmented caption (`top` `entry` `exit`, `channels` `sources` `referrers` `campaigns`, …) | screen default |
| `sort` | `column` or `-column` | screen default |
| `sel` | the selected entity (a path, an event name, a goal id, a country code) | screen default |
| `device` | `all` `desktop` `mobile` on Performance | `all` |

Reading and writing this is one module, `lib/url-state.ts`: `parseSearch(searchParams)` to a
typed `ViewState` and `toSearch(state)`. Client components change state by pushing a new URL
through `useRouter` inside `useTransition`; the pending flag dims the affected region. No
client-side query cache is needed for correctness: the server renders every state.

## 6. The shell

`TopNav` (server component): logo, the nine links with the active one underlined in the
accent, site switcher (a menu of the user's sites, plus "Add a site"), Settings link, avatar
menu (account, sign out).

`PageHeader`: title, subtitle line (for Overview and Realtime the live count with the green
dot, then the resolved range "Aug 6 – Sep 4, 2026 · compared with Jul 7 – Aug 5 ·
America/Toronto"), and the controls on the right.

`Controls`: `RangePicker` (presets plus a two-date custom range, calendar in the site
timezone), `ComparePicker`, the filter chips (grey rectangles: dimension label muted, value
in ink, flag for a country, × to remove), `+ Filter` (a popover: dimension, operator, value
with suggestions from the breakdown for that dimension), `Share` (copies the URL; later opens
the public-dashboard dialog), and one dark primary button where the screen has a primary
action (`+ New goal`, `Save changes`, `Add site`).

`KpiStrip`: n tiles separated by rules, the strong rule on top. A tile is a button; the active
tile has the accent underline and drives the screen's main chart where that applies. Each
tile: label, number, badge with the delta and the comparison value.

`Section`: a title with an optional muted qualifier and a right slot for legends, above any
chart or table. Rules, never boxes.

`DataTable`: `table-layout: fixed`, first column ellipsised, numeric columns right-aligned,
sortable headers with the active sort in ink and a caret, segmented caption for the view,
optional sub-rows (browser versions), a footer with the total count, Show all (opens a
virtualised drawer with search), Export CSV. Row click adds the row's filter; a selected row
(matching `sel`) is underlined in the accent.

Badges and pills: `Badge` up / down / flat; `Pill` good / warn / poor / none with the leading
dot. `RowBar`: a label, a value and a share bar behind, for the small ranked lists in side
panels.

## 7. Charts

The mockups were drawn with hand-written SVG and read well; that is the proposal. Each chart is
a small React server-renderable SVG component with a client wrapper for hover and click.
Inventory, with the screen that owns it:

| Chart | Where | Notes |
|---|---|---|
| `LineChart` | Overview, Realtime (visitors), small trends everywhere | one or two series, previous period dotted, area under the primary at 4.5%, deploy/notes markers later, hover tooltip with delta |
| `BarChart` | Realtime (per minute), Locations (hour), small stacked | last bar in accent |
| `Sparkline` | table trend columns, KPI tiles are without one (D-008) | 64 × 18 |
| `Treemap` | Pages | row-based layout, area visitors, shade engaged time, labels when the cell fits |
| `FlowPanel` | Pages | two ranked `RowBar` lists around a node |
| `Quadrant` | Sources | log x, linear y, bubble r from revenue, average lines, corner labels |
| `Heatmap` | Locations | rows × 24 hours, teal ramp |
| `Histogram` | Devices (viewport width), Performance (LCP) | bands and marker lines |
| `Matrix` | Devices | HTML grid, not SVG |
| `DotPlot` | Goals | value per row against a reference line |
| `Funnel` | Goals | HTML bars with drop-off |
| `PathList` | Events | HTML chips joined by › |
| `SplitBar` | Overview, Devices | HTML |

Interaction contract shared by all: hover shows a tooltip (ink background, white text, delta
when compare is on); click on a mark adds the matching filter; keyboard focus moves between
marks with arrow keys and Enter adds the filter. Charts take data as plain arrays and never
fetch. Width comes from the container (`ResizeObserver` in the client wrapper); the SVG is
drawn at that width so text is never stretched, which the mockups got wrong at first.

The decision this implies (proposed D-009): drop Recharts and `components/ui/chart.tsx`; write
the charts. Phase 2's Sankey for paths is the one chart that may justify a library later, and
that decision waits until then. Reasons and alternatives are in §14.

## 8. Screens

Each screen: what is on it, what data it needs, what is new in the query layer, its states.
"Breakdown(dim, metrics)" below means the existing `breakdown()` primitive, extended per §9 to
return several metrics per row.

### 8.1 Overview (`/[site]`)

As approved. KPI strip: unique visitors, pageviews, bounce rate, engaged time, the KPI goal.
Trend chart driven by the active tile with the previous period dotted. Right column: goal card
(completions, target progress, three-step funnel) and devices split. Three tables: Pages
(Top / Entry / Exit), Sources (Channels / Sources / Campaigns), Locations (Countries / Regions /
Cities). Web Vitals strip at the bottom.

Data: `summary` with compare; `timeseries` for the active metric and its compare; breakdowns
for path, entry_path, exit_path, entry_channel, entry_source, utm_campaign, country, region,
city, device; `vitals`; the KPI goal's completions and its funnel (§9.6). Sixteen queries today
at 2.5 s on 12 months; §10 brings that down.

### 8.2 Realtime (`/[site]/realtime`)

Visitors now (distinct visitors with an event in the last 5 minutes), pageviews and events in
the last 30 minutes, visitors per minute for 30 minutes, pages, entry sources and countries
now, and an activity feed of the last 50 events. The page polls every 10 s through a server
action; the range picker is replaced by a "Last 30 min / Last hour" segment; filters apply.

New: `realtime(ctx)` primitive (§9.4). Empty state: "No one on the site right now" with the
last-seen time. No compare.

### 8.3 Pages (`/[site]/pages`)

Treemap of the top 9 pages (area visitors, shade engaged time), then the table: path,
visitors, pageviews, entries, exits, bounce, engaged, trend, with All / Entry / Exit views and
a search box that filters by glob. Selecting a row (`sel=/pricing`) shows the flow panel
(came from › page › went to next) and three small panels: vitals for the page, goals from the
page, the page's trend.

New: multi-metric breakdown; `pageFlow(path)` (§9.5); per-page vitals is `vitals` with a path
filter; goals from a page is the goal breakdown with a path filter.

### 8.4 Sources (`/[site]/sources`)

KPI strip: visitors, KPI goal completions, revenue, revenue per visitor. Quadrant of sources.
Channels table (visitors, share, KPI completions, conversion, revenue), Sources / Referrers
table, Campaigns table (campaign, source / medium, visitors, completions, revenue; views for
medium, term, content).

New: session-entry attribution (TICKET-027) so a source counts once per session; metrics
`revenue` and `goal_completions(goal)` on breakdowns (§9.2).

### 8.5 Locations (`/[site]/locations`)

Breadcrumb drill-down: Countries, then Regions and Cities of the selected country (`sel=CA`).
Country × hour heatmap in the site's timezone. Languages table.

New: `heatmap(dimension, hour)` (§9.7). Region and city depend on the platform geo headers;
where absent the tables say so.

### 8.6 Devices (`/[site]/devices`)

Device split bar with deltas. Browsers with versions as sub-rows, operating systems with
versions. Viewport-width histogram with the site's breakpoints (from settings, default
640 / 1024 / 1280) and the share per band. Browser × OS matrix.

New: `histogram(expression, bins)` (§9.8), two-dimension breakdown (§9.3).

### 8.7 Events (`/[site]/events`)

Table: event, count, visitors, frequency ("1 in 29 sessions"), last seen, trend. Selected
event: trend with compare, property breakdowns (one panel per property key, top 5 values),
recent occurrences with a link to the session timeline, paths that end in the event.

New: `pathsTo(event)` (§9.9); property keys and values are the existing `prop_key` and
`prop:<key>` breakdowns; "last seen" is `rows("events", limit 1)` per name, folded into the
breakdown as `max(ts)`.

### 8.8 Goals (`/[site]/goals`)

Table of goals: name, definition, completions, conversion, revenue, trend, KPI star. Selected
goal: four tiles (completions, conversion, time to convert, target), funnel (visited the site,
saw the goal's page or preceding step, started, completed), conversion by channel dot plot
against the site average, trend.

New: the `goals` table (§11), `goalStats(goal)` and `funnel(steps)` (§9.6), `timeToConvert`
as a median over sessions. "+ New goal" opens a form: name, kind (pageview glob or event name),
optional revenue, KPI toggle, target.

### 8.9 Performance (`/[site]/performance`)

Strip of p75 LCP, INP, CLS, FCP, TTFB with status pills and deltas. Device segment (all,
desktop, mobile). LCP p75 per day by device with the 2.5 s threshold. Pages table sorted worst
first with a pill per metric. "What is slow" panel for the selected page: LCP element, INP
target, slowest countries. LCP distribution histogram with the three bands. Samples count.

New: `vitalsBreakdown(dimension)` for the per-page table and slowest countries; `vitals`
timeseries per device; attribution targets are the existing `lcp_target` / `inp_target`
columns, grouped.

### 8.10 Settings (`/[site]/settings`)

One page, sub-nav on the left that scrolls to sections. General (name, hostnames, timezone).
Tracking (snippet with copy, framework guide links, module toggles: vitals, outbound, auto
events, store titles, store user ids). Exclusions (IPs as CIDR, paths as globs). Goals and
KPI (the KPI goal select; goals themselves are managed on the Goals screen). Data (retention,
delete site with a typed confirmation). Team: Phase 2, shown disabled.

Data: `analytics.site_settings` (exists: timezone, store_titles, store_user_ids,
excluded_ips, excluded_paths) plus new columns (§11). Saving is a server action per section
with optimistic UI and a toast.

### 8.11 Onboarding (`/sites/new`)

Three steps on one page. 1: name and hostname, then the snippet with copy and framework links.
2: "We are listening": polls every 3 s for the first accepted pageview and shows the check
list (script loaded, hostname matches, pageview accepted, vitals reported) turning green, then
the first pageview's path, city, browser. 3: pick the KPI from suggestions (Signup, Trial
started, Checkout started, Visited /docs/*) or skip. Finish lands on the Overview with a
"Waiting for data" empty state if fewer than 10 pageviews exist.

### 8.12 Sites list (`/dashboard`)

Restyled as a table: site, visitors last 30 days with a sparkline, KPI completions, last event
time, a status pill (receiving data / no data yet / no script seen for 7 days). "Add a site"
is the primary button.

## 9. Query layer additions

All under `lib/query`, each with an integration test on the fixture in
`tests/integration/query.integration.test.ts`.

1. **Session-entry dimensions** (TICKET-027): `entry_referrer`, `entry_source`,
   `entry_channel`, `entry_utm_*`, `entry_path`, `exit_path` as session dimensions in the
   sessions CTE; filters on them match whole sessions.
2. **Metrics**: `revenue` (sum of `revenue`), `payments` (count of rows with revenue),
   `goal_completions(goal)` (count of sessions completing the goal), `conversion(goal)`
   (completions / sessions). Breakdowns and summaries accept a list of metrics and return
   one row with all of them, replacing the one-metric-per-call shape.
3. **Two-dimension breakdown**: `breakdown(ctx, [dimA, dimB], metrics)` for the browser × OS
   matrix.
4. **Realtime**: `realtime(ctx)` returns visitors now (5 min), per-minute pageviews for 30 min,
   top pages, entry sources, countries, and the last 50 events. One query with CTEs, no
   compare, `ts >= now() - interval '30 minutes'` so the `(site_id, ts)` index does the work.
5. **Page flow**: `pageFlow(ctx, path)` with `lag(path)` and `lead(path)` over pageviews
   ordered by `seq` within a session; "left the site" is a null lead; the entry referrer of
   sessions that started on the page fills the "came from" list alongside previous pages.
6. **Goals and funnels**: `goalStats(ctx, goal)` (completions, converting sessions,
   revenue, median seconds from session start to first completion) and `funnel(ctx, steps)`
   where a step is a path glob or an event name and order is within a session. Both are
   pageview or custom-event predicates over the sessions CTE.
7. **Heatmap**: `heatmap(ctx, dimension, "hour")` returns rows per dimension value with 24
   counts in the site timezone.
8. **Histogram**: `histogram(ctx, expression, edges)` using `width_bucket` for viewport widths
   and for LCP.
9. **Paths to an event**: `pathsTo(ctx, event, limit)` collapses each converting session to
   its last four steps before the event and counts identical sequences.
10. **Vitals by dimension**: `vitalsBreakdown(ctx, dimension)` returns p75 per vital per value
    plus the sample count, and `vitals` gains a timeseries form.

Query budget: every screen's first render must finish in under 1.5 s on the seeded site
(181k rows) and under 400 ms on the 30-day range. Each primitive is timed in its integration
test against the seed fixture; a primitive over budget gets an index or a rollup before the
screen ships, not after.

## 10. Data loading

- Every screen is a server component that reads the URL state, authorises the site, builds
  the context and calls one `getXScreen(ctx, state)` function in `lib/screens/<x>.ts`. That
  function runs its queries with `Promise.all` and returns a JSON-safe DTO. Nothing else on the
  server talks to `lib/query`.
- Streaming: the KPI strip and the lead chart are one Suspense boundary, tables another, so the
  numbers paint first. `loading.tsx` per route renders the same layout as skeletons.
- Client components receive DTOs as props and own only interaction: chips, sort, selection,
  hover. State changes push a URL; `useTransition` marks the region pending. No client cache.
- Realtime and the onboarding wait step poll a server action with `setInterval`, paused when
  the tab is hidden.
- Pool: `max: 4` (TICKET-023). With multi-metric breakdowns the Overview drops from sixteen
  queries to about eight. If the 12-month range is still over budget, the next lever is a
  daily rollup table refreshed by `housekeeping()`, decided then.

## 11. Schema

New migration:

```sql
create table public.goals (
  id          bigint generated always as identity primary key,
  site_id     bigint not null references public.websites(id) on delete cascade,
  name        text not null,
  kind        text not null check (kind in ('pageview','event')),
  match       text not null,             -- path glob or event name
  revenue     boolean not null default false,
  target      integer,                    -- completions per month, optional
  created_at  timestamptz not null default now()
);
alter table analytics.site_settings
  add column kpi_goal_id bigint references public.goals(id) on delete set null,
  add column retention_months smallint not null default 24,
  add column breakpoints smallint[] not null default '{640,1024,1280}';
```

RLS on `public.goals` mirrors `websites` (owner select, insert, update, delete). Goals are
read through the query layer with the site id, never through PostgREST.

## 12. States

- Loading: skeletons matching the final layout; never a spinner in the page body.
- Empty: one sentence naming what would fill the space and, where it applies, the action
  ("No events yet. Track one with `lynq.track('signup')`."). Tables show their header and the
  sentence, charts show their axes.
- No data at all for the site: the Overview shows the onboarding step 2 panel inline.
- Error: the section that failed shows its title, "Couldn't load this", and a retry link;
  the rest of the screen still renders. Errors are logged with the screen and query name.
- Filtered to nothing: the chips stay, the empty sentence says "Nothing matches these
  filters", and Clear all is offered.

## 13. Responsive and accessibility

- Under 1000 px: top nav becomes a horizontally scrolling row; controls wrap; three-column
  table rows stack; the treemap, quadrant and heatmap keep full width; tables hide secondary
  columns (entries, exits, share) behind the Show all drawer.
- Under 640 px: KPI strip becomes two columns; the flow panel stacks came-from above went-to.
- Keyboard: every row, cell, mark and chip is reachable; Enter adds the filter; Backspace on a
  chip removes it; `/` focuses search; `[` and `]` step the range.
- Colour is never the only signal: badges carry ▲ ▼, pills carry text, the heatmap has values
  on hover and in the drawer.
- Contrast: `--mute` on white is 3.4:1 and is used only at 11 px or larger for labels; body
  text uses `--ink-2` at 8.9:1.

## 14. Charting decision (proposed D-009)

Options considered:

- **Hand-written SVG React components** (recommended). The mockups prove every chart in the
  inventory in under 80 lines each. Full control of the tokens, server-renderable, no bundle
  cost, no theming fight. Cost: tooltips, hover and keyboard handling are ours to write once
  in a shared wrapper; a Sankey later is real work.
- **Apache ECharts** (the roadmap's earlier pick). Covers everything including Sankey and
  brush-zoom, canvas-based so it does not server-render, 300 KB+ gzipped for the modules
  needed, theming through its own option tree that fights a token system, and its default
  look is far from D-008.
- **Recharts** (current). Line and bar only in practice, awkward for treemaps and heatmaps,
  and its animation caught the walkthrough screenshots mid-draw; it would remain a second
  system next to the hand-written charts anyway.
- **visx**. D3 primitives with React; closest to hand-writing with less control and more
  surface. Not worth the dependency for this inventory.

Consequence: Recharts and `components/ui/chart.tsx` are removed with the old dashboard. If
Phase 2's paths screen needs a Sankey, a library is chosen then for that chart alone.

## 15. Implementation sequence

Tickets, each closable on its own, in this order. Every screen ticket ships behind the new
route so the old dashboard keeps working until the switch.

1. **Tokens and shell**: globals, Tailwind theme, Geist, TopNav, PageHeader, Controls,
   RangePicker, ComparePicker, FilterBuilder and chips, `lib/url-state.ts`, KpiStrip, Section,
   DataTable, Badge, Pill, RowBar, skeletons. Storybook-style preview route under
   `/(dev)/ui` gated to development.
2. **Charts**: the wrapper (size, tooltip, keyboard) and LineChart, BarChart, Sparkline; then
   Treemap, Quadrant, Heatmap, Histogram, DotPlot, Funnel, FlowPanel, PathList, SplitBar. Unit
   tests on the layout math.
3. **Query additions, part one**: TICKET-027 entry dimensions, multi-metric breakdowns,
   revenue and goal metrics, the goals migration. Integration tests and timings.
4. **Overview** on the new shell, replacing `/[site]`. The old components are deleted here.
5. **Pages** with `pageFlow`. 6. **Sources**. 7. **Locations** with `heatmap`.
8. **Devices** with `histogram` and the two-dimension breakdown. 9. **Events** with
   `pathsTo`. 10. **Goals** with `goalStats` and `funnel`. 11. **Performance** with
   `vitalsBreakdown`. 12. **Realtime** with `realtime`. 13. **Settings** and the migration's
   new columns. 14. **Onboarding and the sites list**. 15. **Responsive and keyboard pass**
   across all screens, then the e2e suite gains one flow per screen.

## 16. Open questions for review

1. Should the treemap be limited to the top 9 pages, or show "everything else" as one cell?
2. Quadrant axes: log visitors is right for a long tail, but is conversion the right y for
   sites without a KPI yet? Fallback proposed: engaged time.
3. Realtime "visitors now" as a 5-minute window matches Plausible; DataFast uses 30 minutes
   for its Now view. Which do we call "now"?
4. Is a per-screen `getXScreen` DTO the right seam, or should sections fetch independently so
   a slow table never blocks a fast chart? (Suspense boundaries give most of that already.)
5. Query budget numbers in §9 are targets, not measurements; the first query ticket measures.
