# Phase 1 design: the app shell and every screen

Version 4, 2026-09-05. Owner: harsh. Status: ready for owner sign-off (TICKET-025).

- v1: first draft from the approved mockups.
- v2: review pass 1 (design and information architecture) folded in.
- v3: review passes 2 (implementation feasibility against the codebase) and 3 (accessibility,
  interaction, responsive, states) folded in. Both reviews are summarised in §18.
- v4: owner decision, charts come from a library, not hand-written SVG. §7 and §14 rewritten
  for Apache ECharts; §16 tickets 5 and 6 re-scoped.

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
Performance and Settings screens; onboarding for a new site; the sites list; the session
drawer; loading, empty and error states; accessibility and responsive behaviour; the query
primitives and schema those screens need; the charting decision; the sequence of
implementation tickets.

Out: the landing page and the auth pages' look (owner, 2026-09-05: "we can do that later as
it'll need some graphics"; the new body colours are scoped to `app/(main)` so the landing page
keeps rendering as it does today); Phase 2 features (funnels as a product, paths, retention,
people, alerts, notes, bot traffic, MCP); a dark theme (D-008: light only); teams and roles;
public dashboards and email digests (roadmap Tier 1 "Sharing", after the screens exist); saved
segments (Phase 0 §9.3 placed them in Phase 1; they ship right after the screens as "Save this
view" in the chip bar plus a small table, because every screen must exist before a saved view
has anything to save).

## 2. Direction, restated as rules

From D-008 and the mockup reviews:

1. White page, near-black type, rules instead of borders and shadows. A bordered card appears
   once, for the onboarding status; the Overview's goal and devices panels are rule-separated
   panels, not cards.
2. One accent, teal `#0f766e`. It encodes selection, activity, a link, or a data value in a
   chart (a series, a ramp). It is never ornament.
3. Semantic colour is only for status: good, needs work, poor; up, down. Badges and pills carry
   it. Nothing else is green, amber or red.
4. Personality comes from data: delta badges, flags, a goal panel, a devices split, a treemap,
   a quadrant, a heatmap. Not from illustration, gradients or rounded panels.
5. Every screen leads with the view its data has a shape for, then the table. The same three
   tables on every page was the failure mode the owner named.
6. Tables are real tables: sortable columns, right-aligned numbers, tabular numerals, a
   segmented caption for the view (Top / Entry / Exit), a footer with the count and Show all.
7. Everything is a filter, and on some screens a click first selects. On a screen with a
   detail panel for a selected entity (Pages, Events, Goals, Performance, Locations' drill),
   clicking a row, cell or mark selects it (`sel`); the row's Filter button (§6) or Shift+Enter
   on a mark adds the chip. On the Overview and on tables with no detail panel, a click adds
   the chip directly. Every control's accessible name says which of the two it does. Chips
   live in the URL, so every view is a link. Degradation: when a chip pins a screen's lead
   dimension to one value, the lead view drops one level and says so in one line ("Filtered
   to Canada, showing regions"): Locations' heatmap shows regions, Pages' treemap gives way to
   the flow panel, Devices' split becomes browsers.
8. No chart is ever the only representation of a dataset. Every chart has a table beside it or
   a visually hidden table of the same numbers (§7).
9. Light only. No toggle.

## 3. Tokens

CSS custom properties on `:root` in `app/globals.css`, mapped into Tailwind's theme so classes
like `bg-canvas`, `text-mute`, `border-rule` and `text-accent-ink` exist. The current HSL
shadcn variables, `darkMode: ["class"]`, the `tailwindcss-animate` plugin and `framer-motion`
go; the shadcn components that stay (dialog, dropdown, select, tooltip, input, label,
separator) are restyled on the new tokens. The `bg-black text-white` body class in
`app/layout.tsx` moves into `app/(main)/layout.tsx` as `bg-canvas text-ink`, so the landing
and auth pages are untouched.

Ratios below are measured with the WCAG formula, on white unless stated. In code the `--accent*`
tokens are named `--teal*` (Tailwind `teal-*`), because the old shadcn `--accent` HSL variable is
still read by components that leave with the Overview ticket; the design keeps the generic name.

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#ffffff` | page |
| `--soft` | `#f5f5f7` | segmented control track, chips, code blocks, hover rows |
| `--soft-2` | `#ececf0` | pressed / toggle track |
| `--ink` | `#0a0a0a` | headings, primary numbers, first table column, every chart label |
| `--ink-2` | `#4a4a52` | body and table cells (8.8:1) |
| `--mute` | `#63636c` | labels, captions, table headers, axis text (5.9:1 on white, 5.5 on `--soft`, 5.1 on `--soft-2`; all AA at 11 px) |
| `--faint` | `#9a9aa3` | placeholder text and decorative separators only; never text or marks that carry information |
| `--rule` | `#e8e8ec` | table row rules, section rules |
| `--rule-strong` | `#111111` | the one heavy rule above a section, the nav bottom border |
| `--accent` | `#0f766e` | selection underline, active tab, chart primary series (4.7:1 on `--accent-soft`) |
| `--accent-ink` | `#0b5f59` | link text (7.5:1) |
| `--accent-soft` | `#e3f1ef` | selected row background, active nav |
| `--accent-bar` | `#e6f2f0` | share bars in `RowBar` side panels only, never inside a DataTable (D-008) |
| `--accent-2` / `--accent-3` | `#7fbdb6` / `#cfe6e2` | second and third series in the split bar and stacked charts, always separated from neighbours by a 1 px `--canvas` gap and named in a legend; they do not meet 3:1 on white and are never used alone |
| `--good` / `--good-soft` | `#0c6a35` / `#e1f3e8` | up, Good (5.8:1 on soft) |
| `--warn` / `--warn-soft` | `#845400` / `#fbefd2` | Needs work (5.7:1 on soft) |
| `--poor` / `--poor-soft` | `#b31e18` / `#fbe4e2` | down, Poor, danger (5.6:1 on soft) |
| `--compare` | `#8a8a93` dotted 1.5 3, also the stroke of informational sparklines | previous-period line (3.4:1, the 1.4.11 floor for graphics) |

Type: Geist 400 / 500 / 600 from Google Fonts (`next/font/google`), `font-variant-numeric:
tabular-nums` on every numeric cell and KPI. Satoshi, CalSans, their `localFont` calls, the
`--font-heading` rule and the files under `public/assets/fonts` are removed. Scale: 26 / 500
page title, 30 / 500 KPI number (24 under 480 px), 14 / 500 section title, 13.5 body, 13 table,
12 labels, 11.5 badges and table headers. Radii: 4 for small controls and chips, 6 for buttons
and inputs, 8 for the onboarding card, 999 for badges and pills. No shadows except the
segmented control's active thumb (`0 1px 2px rgba(0,0,0,0.12)`).

Chart palette: series 1 `--ink` (trend line on Overview and Realtime), series 2 `--accent`
(selected entity's line, bars), previous period `--compare` dotted, fills at 4.5% opacity of
the accent, heatmap and treemap ramps from `rgba(15,118,110,0.04)` to `0.8` with every label in
`--ink` (5.3:1 on the darkest cell; white failed), histogram bands in the semantic colours.
Gridlines `--rule`. Axis text `--mute` 11 px.

Motion: one global `@media (prefers-reduced-motion: reduce)` block zeroes every transition and
animation (segmented thumb, drawers, treemap and bar re-layout, pending fades). The Realtime
chart never animates its re-draw in either mode.

## 4. Information architecture and routes

```
/sites                     sites list (/dashboard redirects here)
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
/api/live/[site]           Route Handler polled by Realtime and onboarding (§10)
```

`[site]` stays the slug column on `public.websites`. Top navigation lists the nine screens in
that order; Settings sits on the right beside the site switcher and the account avatar. Under
640 px the nav shows Overview, Realtime and Pages inline and the rest under a "More" menu;
between 640 and 1000 px it is a horizontally scrolling row with the active link scrolled into
view and `scroll-padding-inline` so a focused item is never half off-screen.

The session timeline is a drawer, not a route, addressed by `session=<visitor_id>:<session_id>`
on any screen and served by the existing `rows(ctx, "session")`: the session's pageviews and
events in order with engaged time per page. Reachable from Events (recent occurrences),
Realtime (the feed) and later People.

A slug that does not exist is `notFound()`. A slug that exists but the user does not own
renders a named page ("You no longer have access to example.com") with a link to `/sites`,
never a redirect loop. The guest account (`GUEST_USER_ID`) keeps its current rule: every write
(settings, goals, onboarding, KPI) is rejected server-side with a one-line notice; the guest
sees the screens and cannot change them. `websites.is_first_visit` is dropped: onboarding
replaces what it gated.

## 5. URL state

Everything that changes what the screen shows lives in the query string, so the back button,
reload and sharing all work and the server renders the right thing on first load.

| Param | Values | Default |
|---|---|---|
| `range` | `last_24h` `last_7d` `last_30d` `last_90d` `last_12mo` `today` `yesterday` `this_week` `this_month` or `YYYY-MM-DD,YYYY-MM-DD` | `last_30d` |
| `compare` | `previous_period` `previous_year` `none` | `previous_period` |
| `f` | repeated; `dimension:op:value` with `op` in `is` `is_not` `contains`; several values joined with `\|`; value URL-encoded | none |
| `view.<region>` | the segmented caption of one table region: `view.pages=exit`, `view.sources=campaigns` | region default |
| `sort.<region>` | `column` or `-column` for one table region | region default |
| `sel` | the selected entity (a path, an event name, a goal id, a country code); one per screen | screen default |
| `session` | `<visitor_id>:<session_id>` opens the session drawer | none |
| `device` | `all` `desktop` `mobile` on Performance | `all` |

Regions are named per screen (`pages`, `sources`, `locations` on the Overview; `main` on a
single-table screen). Unknown or malformed params are ignored, never errors.

Chips have two scopes and the label says which. A row-scoped chip (`path`, `country`,
`device`, `browser`, `event_name`, …) keeps the events that match. A session-scoped chip
(`entry_channel`, `entry_source`, `entry_referrer`, `entry_utm_*`, `entry_path`, `exit_path`,
`bounced`) keeps whole sessions that match, and its label reads "Entry channel · Organic
Search" so the scope is visible, in the accessible name as well as on screen. Composition:
sessions matching every session chip, then events within them matching every row chip; within
one dimension values are OR. Worked example: `f=entry_channel:is:Organic Search` and
`f=path:is:/pricing` gives pageviews of /pricing inside sessions that arrived from organic
search; visitors on the KPI strip counts the distinct visitors of those pageviews, sessions
counts the matching sessions.

`lib/url-state.ts` is the one module that reads and writes this:

```ts
export type ViewState = {
  range: Range; compare: CompareMode | "none"; filters: Filter[];
  view: Record<string, string>; sort: Record<string, { col: string; dir: "asc" | "desc" }>;
  sel?: string; session?: { visitorId: string; sessionId: string }; device?: "all" | "desktop" | "mobile";
};
export function parseSearch(sp: Record<string, string | string[] | undefined>): ViewState; // never throws
export function toSearch(s: ViewState): URLSearchParams;                                   // stable key order
export function withFilter(s: ViewState, f: Filter): ViewState;      // OR-merges into the same dimension
export function withoutFilter(s: ViewState, dimension: string, value?: string): ViewState;
export function withParam<K extends keyof ViewState>(s: ViewState, k: K, v: ViewState[K]): ViewState;
```

Next 16 hands the page `searchParams` as a promise of `string | string[] | undefined` per key,
so a single `f` arrives as a bare string and `parseSearch` normalises both shapes. It validates
every dimension against `ROW_DIMENSIONS`, `SESSION_DIMENSIONS` and the `prop:` form before it
becomes a `Filter`, so `compileFilters` never throws on user input. `toSearch` writes keys in a
fixed order because it is what Share copies and what the router dedupes on. Client components
change state only through `useRouter().push(toSearch(next))` inside `useTransition`; never
`window.history.pushState` (the current `nav-tabs.tsx` does that and back/forward then restore
a URL the server never re-rendered). Unit tests cover round-trips and every malformed input.

## 6. The shell

`TopNav` (server component): logo, the nine links with the active one underlined in the
accent (`aria-current="page"`), site switcher (a menu of the user's sites, plus "Add a site"),
Settings link, avatar menu (account, sign out). It is sticky, so every focusable row, mark and
chip carries `scroll-margin-top` equal to its height (WCAG 2.4.11).

`PageHeader`: title, subtitle line (for Overview and Realtime the live count with the green
dot, then the resolved range "Aug 6 – Sep 4, 2026 · compared with Jul 7 – Aug 5 ·
America/Toronto"), and the controls on the right.

`Controls`: `RangePicker` (presets plus a two-date custom range; the calendar is a non-modal
popover whose day grid is `role="grid"` named with the month and the site timezone, arrows move
a day, PageUp and PageDown a month, Home and End the week, `aria-selected` on the range and
`aria-current="date"` on today; picking the start announces "Start Aug 6 selected. Choose an end
date."; ‹ › buttons step the range and are the accessible path for the `[` `]` shortcuts),
`ComparePicker`, the filter chips, `+ Filter`, `Share` (copies the URL; later opens the
public-dashboard dialog), and one dark primary button where the screen has a primary action.

Chips: one chip is one `<button>` named "Country is Canada, press Delete to remove"; Delete or
Backspace while it has focus removes it; the × is a 24 px click target inside the same button.
After removal focus goes to the next chip, else the previous, else `+ Filter`. Every filter
change, after the transition settles, is announced once through the page's single
`role="status"` region: "Removed Country is Canada. 2 filters. 3,201 visitors." Session-scoped
chips carry their scope in the name (§5).

`+ Filter` popover: a non-modal dialog; focus lands on the dimension control; Escape closes
and returns focus to the button; the value field is a combobox (`aria-expanded`,
`aria-controls`, `aria-activedescendant`) over a listbox of suggestions from the breakdown for
that dimension, with a polite "12 results" count.

`KpiStrip`: n tiles separated by rules, the strong rule on top. The tiles are a
`role="radiogroup"` named "Metric": arrow keys move, the checked tile has the accent underline
and drives the screen's lead chart. A tile that has a natural home elsewhere carries a small
explicit "→ Pages" link; the tile itself never navigates. Each tile: label, number, badge with
the delta and the comparison value. Under 480 px the strip is one horizontally scrolling row
with `scroll-snap-type: x mandatory`, the checked tile scrolled into view, numbers at 24 px;
between 480 and 1000 px two columns.

`Section`: a title with an optional muted qualifier and a right slot for legends, above any
chart or table. Rules, never boxes.

`DataTable`: `table-layout: fixed`, first column ellipsised, numeric columns right-aligned,
tabular numerals. Semantics: every column header is `<th scope="col" aria-sort="…">` (present on
all columns, `none` when unsorted) wrapping a `<button>` named with the next action ("Visitors,
sorted descending, activate to sort ascending"). The segmented caption is a `role="tablist"` of
`<a role="tab">` links writing `view.<region>`, so middle-click and copy-link work. The selected
row (matching `sel`) is `aria-current="true"` with the accent underline; tables stay tables, not
grids. Sub-rows (browser versions) stay in the same table: the parent's first cell holds a
`<button aria-expanded aria-controls>` and child rows carry a visually hidden "Chrome, version"
prefix. Rows are one Tab stop with roving `tabindex`: arrows move between rows, Enter performs
the row's primary action (select or filter per rule 7), `F` or Shift+Enter performs Filter, and
the same actions sit in the row's context menu. The Filter button is a real `<button>` in the
last cell, visually hidden until the row is hovered or has focus within, always in the tab
order, with a 32 px tap area. When compare is on, every metric column carries its delta as
small green or red text after the number (the second question is always "why did this
move"). No share bars inside tables (D-008); ranking is the sort. Footer: total count, Show all
(a drawer with search; a plain table under 300 rows, otherwise a virtualised `role="grid"` with
`aria-rowcount` and `aria-rowindex`), Export CSV. Under 1000 px secondary columns (entries,
exits, share) are hidden, not stacked, and remain in the drawer and the CSV. Every scrollable
container (drawer body, nav strip, table wrapper) is `tabindex="0"` with `role="region"` and a
label so keyboard users can scroll it; the current events accordion gets this wrong.

Drawers (session, Show all): `role="dialog" aria-modal="true"` labelled by the drawer heading,
`inert` on the page behind, focus to the heading, Escape closes, focus returns to the invoking
row or mark. History rule: opening pushes the param; closing calls `router.back()` if this
session pushed that entry, otherwise `router.replace()` without the param, so Back never
re-opens a drawer. On reload with the param present the drawer opens with focus on its heading
and closing moves focus to the matching row if it is on the page, else to the `<h1>`. The same
rule applies to `sel`.

Badges and pills: `Badge` up / down / flat with ▲ ▼ glyphs; `Pill` good / warn / poor / none
with the leading dot and the word. `RowBar`: a label, a value and a share bar behind, for the
small ranked lists in side panels.

Keyboard shortcuts obey WCAG 2.1.4: none is a bare document-level single key. `[` and `]`
work only while focus is inside `Controls`; `/` focuses search only when no text field has
focus and a visible Search control exists; Delete and Backspace act only on a focused chip;
`?` opens the shortcut sheet; Settings › General has a "Keyboard shortcuts" switch that turns
them all off. The sheet is the one place they are documented.

## 7. Charts

Charts are Apache ECharts (D-009, §14), loaded through `echarts/core` with only the components
and chart types the inventory needs, and rendered by one client component, `<Chart>`, that
owns the instance. Nothing else imports ECharts.

Theme: one ECharts theme object, `lib/charts/theme.ts`, generated from the §3 tokens (text
`--mute` 11 px Geist, gridlines `--rule`, primary series `--ink`, accent series `--accent`,
previous period `--compare` dotted, area fills at 4.5%, teal ramps for treemap and heatmap,
semantic band colours for histograms, tooltip in `--ink` with white text, no shadows, no
animation when `prefers-reduced-motion` is set and never on Realtime). Registered once with
`echarts.registerTheme("lynq", theme)`. The renderer is SVG, so marks are DOM nodes that
inherit the page's fonts and can be inspected, and tooltip and legend text is real text.

Rendering: ECharts draws after hydration, so a chart's server HTML is its `<figure>`, its
title and description, its table equivalent (rule 8) and a fixed-height skeleton the chart
paints over; the height is set by the section, never by the data, so nothing shifts. The
instance resizes with a `ResizeObserver` on its container and is disposed on unmount.

Data: `<Chart>` takes a plain `option` built by a pure function per chart kind in
`lib/charts/*.ts` (`lineOption(series, opts)`, `treemapOption(cells)`, …) from the DTO arrays;
those functions are unit-tested and never fetch. Interaction: `<Chart>` maps ECharts `click`
events on a mark to the screen's select-or-filter action (rule 7) through a callback prop, and
exposes `onHover` for the screens that mirror the hovered value in a side panel.

Accessibility contract: ECharts' `aria: { enabled: true }` generates a description sentence
per chart (series names, extremes, count) which is placed on the `<figure>`; the SVG itself is
`aria-hidden` behind it. Keyboard and screen-reader users work from the table equivalent,
which every chart must have: visible beside it (Pages, Sources, Locations, Devices,
Performance) or a visually hidden `<table>` with the same numbers (line charts, sparklines,
histogram bands, the dot plot). Marks are therefore not focusable; the table row is the
accessible way to select or filter the same entity, and the two stay in sync through `sel`
and the chips. Tooltips satisfy 1.4.13 by being hoverable and dismissed on pointer leave; they
carry nothing the table lacks. Touch: the hit tolerance is widened so marks meet 24 × 24
(2.5.8).

| Chart | ECharts type | Where | Table equivalent |
|---|---|---|---|
| Line | `line` with `areaStyle` on the primary, dashed previous period | Overview, Realtime, small trends | hidden table of bucket, value, previous |
| Bar | `bar` | Realtime (per minute), Locations (hour) | hidden table |
| Sparkline | `line`, no axes, no tooltip, `--compare` stroke | table trend columns | the row it sits in |
| Treemap | `treemap` with `visualMap` on engaged time, labels in `--ink`, an "everything else" leaf | Pages | the Pages table |
| Quadrant | `scatter` with `symbolSize` from revenue, `markLine` for the averages, corner labels as `graphic` text | Sources | the Sources table with both axis metrics |
| Heatmap | `heatmap` on a 24-column category axis with `visualMap` | Locations | the Show all drawer's table |
| Histogram | `bar` with per-bar `itemStyle` for the bands and `markLine` for breakpoints | Devices, Performance | hidden table of band, count, share |
| Dot plot | `scatter` on a category y-axis with `markLine` for the average | Goals | hidden table of channel, rate, delta |

HTML, not ECharts: `FlowPanel` (two ranked `RowBar` lists around a node), `Funnel` (an `<ol>`
with bars and drop-off text; ECharts' funnel shape is decorative and hides the numbers),
`PathList`, `Matrix` (a real `<table>`), `SplitBar` (`role="img"` naming every segment). Phase
2's paths view will use ECharts `sankey`, one reason ECharts was preferred over Nivo (§14).

Bundle: `echarts/core` plus `LineChart`, `BarChart`, `ScatterChart`, `TreemapChart`,
`HeatmapChart`, the grid, tooltip, legend, visualMap and markLine components and the SVG
renderer, loaded once through a dynamic import so the shell and tables paint before the chart
code arrives. Measured in the chart ticket; the budget is 220 KB gzipped for the chart bundle.

## 8. Screens

Each screen: what is on it, what data it needs, what is new in the query layer, its states.
"Breakdown(dim, metrics)" below means the `breakdown()` primitive extended per §9.2.

### 8.0 The KPI in its three states

The number-one KPI is a goal marked in settings. Revenue exists when any event in the range
carries a non-null `revenue`. Every screen DTO carries `kpi: {goal, hasRevenue}` from one
cheap probe, and renders by this table:

| State | Overview strip | Sources strip | Tables and quadrant | Sites list |
|---|---|---|---|---|
| No goal | sixth tile is a ghost tile "Set a KPI →" linking to Goals | visitors, sessions, bounce, engaged | no completions or conversion columns; quadrant y is engaged time per session with axis-derived corner labels | KPI column reads "—" with "set" link |
| Goal, no revenue | KPI tile: completions and conversion | visitors, KPI completions, conversion, engaged | completions and conversion columns; quadrant y is conversion, bubble radius is completions | KPI completions |
| Revenue | KPI tile stays; revenue joins the Sources strip | visitors, KPI completions, revenue, revenue per visitor | plus revenue column; bubble radius is revenue | KPI completions and revenue |

### 8.1 Overview (`/[site]`)

As approved, with one tile added on review: unique visitors, sessions, pageviews, bounce rate,
engaged time, the KPI goal (six tiles; bounce rate needs its denominator visible). Trend chart
driven by the checked tile with the previous period dotted. Right column: goal panel
(completions, target progress, three-step funnel) and devices split. Three tables: Pages
(Top / Entry / Exit), Sources (Channels / Sources / Campaigns), Locations (Countries / Regions /
Cities). Web Vitals strip at the bottom.

Data: `summary` with compare; `timeseries` for the checked metric and its compare; breakdowns
for path, entry_path, exit_path, entry_channel, entry_source, utm_campaign, country, region,
city, device; `vitals`; the KPI goal's `goalStats` and `funnel` (§9.6). About eight queries
after §9.2, in two rounds on the four-connection pool.

### 8.2 Realtime (`/[site]/realtime`)

"Now" is the last 5 minutes (Plausible's definition; DataFast's 30-minute view is the second
tile here). Visitors now (distinct visitors with an event received in the last 5 minutes),
pageviews and events in the last 30 minutes, visitors per minute for 30 minutes, pages, entry
sources and countries now, and an activity feed of the last 50 events. A "Last 30 min / Last
hour" segment replaces the range picker; filters apply, including session chips (the sessions
CTE is built over the `received_at` window here).

Polling: the page calls `/api/live/[site]` every 10 s; a Pause / Resume control sits beside the
segment (WCAG 2.2.2) and its state lasts for the session. Back-off to 30 s then 60 s after
five polls with no change; honour `navigator.connection.saveData`; pause when the tab is
hidden; stop after 15 minutes without interaction with a "Resume live updates" button. The
feed is not a live region: new rows accumulate behind a "3 new events, show" button. Only the
visitors-now number is `role="status"`, throttled to one announcement per 30 s. The per-minute
chart never animates.

New: `realtime(ctx)` primitive (§9.4), on `received_at`, not `ts`: `ts` is the client's wall
clock and can be skewed either way; `received_at` is the server's. Empty state: "No one on the
site right now" with the last-seen time. No compare.

### 8.3 Pages (`/[site]/pages`)

Treemap of the top 12 pages plus one "everything else" cell so the area sums to the total
(area visitors, shade engaged time), then the table: path, visitors, pageviews, entries, exits,
bounce, engaged, trend, with All / Entry / Exit views and a search box that filters by glob.
Selecting a row (`sel=/pricing`) shows the flow panel (came from › page › went to next) and
three small panels: vitals for the page, goals from the page, the page's trend.

New: multi-metric breakdown; `pageFlow(path)` (§9.5); per-page vitals is `vitals` with a path
filter; goals from a page is `goalStats` with a path filter.

### 8.4 Sources (`/[site]/sources`)

KPI strip per §8.0. Quadrant of sources. Channels table (visitors, share, KPI completions,
conversion, revenue), Sources / Referrers table, Campaigns table (campaign, source / medium,
visitors, completions, revenue; views for medium, term, content).

New: session-entry attribution (TICKET-027, §9.1) so a source counts once per session;
`revenue`, `payments` and goal metrics on breakdowns (§9.2).

### 8.5 Locations (`/[site]/locations`)

Breadcrumb drill-down: Countries, then Regions and Cities of the selected country (`sel=CA`).
Country × hour heatmap in the site's timezone. Languages table.

New: `heatmap(dimension, hour)` (§9.7). Region and city depend on the platform geo headers;
where absent the tables say so.

### 8.6 Devices (`/[site]/devices`)

Device split bar with deltas. Browsers with versions as sub-rows, operating systems with
versions. Viewport-width histogram with the site's breakpoints (from settings, default
640 / 1024 / 1280) and the share per band. Browser × OS matrix.

The tracker today sends `screen.width`, which is not the viewport: a 1440 px laptop in a 900 px
window bins as 1440 and the breakpoint bands would be wrong for their stated purpose. The
tracker gains `vw` and `vh` (innerWidth, innerHeight at the pageview), ingest stores them as
`viewport_width` and `viewport_height` (§11), the seed generates them, and the histogram uses
the viewport, falling back to screen width for rows that predate the column and saying so.

New: `histogram(expression, edges)` (§9.8), two-dimension breakdown (§9.3).

### 8.7 Events (`/[site]/events`)

Table: event, count, visitors, frequency ("1 in 29 sessions"), last seen, trend. Selected
event: trend with compare, property breakdowns (one panel per property key, top 5 values),
recent occurrences with a link that opens the session drawer, paths that end in the event.

New: `pathsTo(event)` (§9.9); property keys and values are the existing `prop_key` and
`prop:<key>` breakdowns; "last seen" is `max(ts)` carried as a metric in the breakdown (§9.2).

### 8.8 Goals (`/[site]/goals`)

Table of goals: name, definition, completions, conversion, revenue, trend, KPI star. Selected
goal: four tiles (completions, conversion, time to convert, target), funnel (visited the site,
saw the goal's page or preceding step, started, completed), conversion by channel dot plot
against the site average, trend.

New: the `goals` table (§11), `goalStats(goal)` and `funnel(steps)` (§9.6). "+ New goal" opens
a form: name, kind (pageview glob or event name), optional revenue, KPI toggle, target.

### 8.9 Performance (`/[site]/performance`)

Strip of p75 LCP, INP, CLS, FCP, TTFB with status pills and deltas. Device segment (all,
desktop, mobile). LCP p75 per day by device with the 2.5 s threshold. Pages table sorted worst
first with a pill per metric. "What is slow" panel for the selected page: LCP element, INP
target, slowest countries. LCP distribution histogram with the three bands. Samples count.

New: `vitalsBreakdown(dimension)` over the five rendered vitals for the per-page table and
slowest countries; `vitals` gains a timeseries form per device; attribution targets are the
existing `lcp_target` / `inp_target` columns, grouped.

### 8.10 Settings (`/[site]/settings`)

One page, sub-nav on the left that scrolls to sections. General (name, hostnames, timezone,
keyboard shortcuts switch). Tracking (snippet with copy, framework guide links, module toggles:
vitals, outbound, auto events, store titles, store user ids; the ingest diagnostics panel from
§8.11). Exclusions (IPs as CIDR, paths as globs). Goals and KPI (the KPI goal select; goals
themselves are managed on the Goals screen). Data (retention, delete site with a typed
confirmation). Team: Phase 2, shown disabled.

Data: `analytics.site_settings` (exists: timezone, store_titles, store_user_ids,
excluded_ips, excluded_paths) plus new columns (§11); most sites have no row yet, so every
save is an upsert. Saving is a server action per section with optimistic UI and a toast; the
guest's saves are rejected with a notice.

### 8.11 Onboarding (`/sites/new`)

Three steps on one page. 1: name and hostname, then the snippet with copy and framework links.
2: "We are listening": polls `/api/live/[site]` every 3 s for the first accepted pageview and
shows the check list (script loaded, hostname matches, pageview accepted, vitals reported)
turning green, then the first pageview's path, city, browser. If 60 s pass with nothing
accepted, the step reads `analytics.ingest_log` for the site's hostnames and names the actual
rejection in plain words: "We received events from www.example.com, which is not one of this
site's hostnames" (stage `site_mismatch`), "The request had no Origin header; is the snippet
inside a sandboxed iframe?" (`origin_missing`), "Traffic arrived but all of it was classified
as bots" (`bot`), "The page path /preview/x is on your excluded list" (`excluded_path`). The
same diagnostics panel lives in Settings › Tracking. 3: pick the KPI from suggestions (Signup,
Trial started, Checkout started, Visited /docs/*) or skip; skipping leaves the KPI unset
(§8.0). Finish lands on the Overview with a "Waiting for data" empty state if fewer than 10
pageviews exist.

### 8.12 Sites list (`/sites`)

Restyled as a table: site, visitors last 30 days with a sparkline, KPI completions, last event
time, a status pill (receiving data / no data yet / no script seen for 7 days). "Add a site"
is the primary button.

## 9. Query layer additions

All under `lib/query`, each with an integration test on the fixture in
`tests/integration/query.integration.test.ts`, extended where noted.

1. **Session-entry dimensions** (TICKET-027): the sessions CTE gains, opt-in through its
   existing `extra` mechanism so `summary` and `timeseries` do not pay for it, one composite
   `entry` column taken from the session's first pageview:
   ```sql
   (array_agg(row(e.referrer, e.source, e.channel, e.utm_source, e.utm_medium, e.utm_campaign,
                  e.utm_term, e.utm_content)
      order by e.ts, e.seq, e.pageview_id) filter (where e.event = 'pageview'))[1] as entry
   ```
   projected as `(s.entry).channel` and so on. `min()` over these columns, the current `extra`
   form, returns `''` for every session because only the first pageview carries them, which is
   the bug the ticket exists to fix. `referrer`, `source`, `channel` and `utm_*` leave
   `SESSION_CONSTANT` in the same change so the old per-row path stops producing a second,
   wrong answer. Session filters on the entry dimensions match whole sessions. Served by
   `events_site_ts`; no new index.
2. **Multi-metric breakdown**: one call returns several metrics per row. Row metrics and
   session metrics need different grouping, so the query has two grouped CTEs joined on the
   value, never one GROUP BY over the joined rows (that would count sessions as event rows):
   ```sql
   with sess as materialized (...),
   rowm as (select <dim> as value,
            count(*) filter (where e.event = 'pageview')::int as pageviews,
            count(distinct e.visitor_id)::int as visitors,
            coalesce(sum(e.revenue), 0)::float8 as revenue,
            count(*) filter (where e.revenue is not null)::int as payments,
            max(e.ts) as last_seen
       from analytics.events e join sess s using (visitor_id, session_id)
      where <scope> and <rowWhere> group by 1),
   pairs as (select distinct <dim> as value, s.visitor_id, s.session_id, s.bounced, s.duration_ms
       from analytics.events e join sess s using (visitor_id, session_id) where <scope> and <rowWhere>),
   sessm as (select value, count(*)::int as sessions,
            round(100.0 * count(*) filter (where bounced) / nullif(count(*), 0), 2)::float8 as bounce_rate,
            coalesce(round(avg(duration_ms)), 0)::float8 as engaged_time
       from pairs group by 1)
   select coalesce(r.value, m.value) as value, r.*, m.*, count(*) over ()::int as total
     from rowm r full join sessm m using (value)
    order by <orderBy> desc nulls last, 1 limit $l offset $o
   ```
   `pairs` reads `sess` alone when the dimension is session-constant. Signature:
   ```ts
   type MetricSpec = Metric | "revenue" | "payments" | "last_seen"
     | { kind: "goal_completions" | "conversion"; goalId: number };
   breakdownQuery(ctx, dimension: string | [string, string], metrics: MetricSpec[],
     opts: { limit?; offset?; propKey?; orderBy?: MetricSpec; dir?: "asc" | "desc" }, w?)
   // row: { value: string; value2?: string; total: number } & Record<string, number | string | null>
   ```
   The single-metric `breakdown()` in `run.ts` stays as a wrapper so `lib/dashboard.ts` keeps
   working until the Overview ticket deletes it. `last_seen` is a string, so the row type
   admits it.
3. **Two-dimension breakdown**: the same query with `group by 1, 2` over two row dimensions,
   returning `value` and `value2`, for the browser × OS matrix.
4. **Realtime**: `realtime(ctx)` returns visitors now (5 min), per-minute pageviews for 30
   min, top pages, entry sources, countries, and the last 50 events, as one row of `jsonb_agg`
   sub-selects over a single `recent as materialized` CTE on `received_at >= now() - interval
   '30 minutes'`, served by the new `(site_id, received_at)` index (§11). The sessions CTE for
   this screen is built over the same `received_at` window so session chips compose. The
   integration fixture inserts rows with `received_at = now()`; the seed stamps `received_at`
   just after `ts`, so the seeded site only shows realtime traffic within a day of a seed run.
5. **Page flow**: `pageFlow(ctx, path)` builds the context with a `path is $1` filter so the
   sessions CTE's `having bool_or(<rowWhere>)` keeps only sessions that touched the page, then
   `lag(path)` and `lead(path)` over `(partition by visitor_id, session_id order by ts, seq,
   pageview_id)` within those sessions, dropping rows where `path = lag(path)` (Phase 0 §6.3,
   loop collapsing). "Left the site" is a null lead; the entry referrer of sessions that
   started on the page joins the "came from" list.
6. **Goals and funnels**: `goalStats(ctx, goal)` (completions, converting sessions, revenue,
   median seconds from session start to first completion) and `funnel(ctx, steps)` where a
   step is a path glob (through `globToLike` in `lib/ingest/glob.ts`) or an event name. Order
   within a session needs no self-join: one `min((ts, seq, pageview_id)) filter (where <step>)`
   per step per session, then monotonic comparison of the composites (`t2 >= t1`), never bare
   `ts`, so same-millisecond steps cannot flip. Time to convert is `percentile_cont(0.5)` over
   the first-completion offset.
7. **Heatmap**: `heatmap(ctx, dimension, "hour")` returns long form `(value, hour, count)` with
   `extract(hour from e.ts at time zone $tz)`; TypeScript pivots to 24 columns. No 24 `filter`
   columns, no dynamic SQL.
8. **Histogram**: `histogram(ctx, expression, edges)` using `width_bucket(expr::float8,
   $edges::float8[])`, guarded by `expr > 0` because widths default to 0.
9. **Paths to an event**: `pathsTo(ctx, event, limit)` starts from a `conv` CTE on
   `events_custom_name` (the converting sessions and their first completion time), joins
   `events` on `(site_id, visitor_id, session_id)` through `events_site_session`, numbers the
   preceding pageviews with `row_number() over (... order by ts desc)`, aggregates the last four
   paths per session and counts identical sequences.
10. **Vitals by dimension**: `vitalsBreakdown(ctx, dimension)` is `vitals.ts` restricted to the
    five rendered vitals with `group by <dim>` plus the sample count; `vitals` gains a
    timeseries form split by device.

Query budget: every screen's first render under 1.5 s on the seeded site (181k rows) for a
12-month range and under 400 ms on 30 days. At this volume the scan is 30 to 80 ms; the binding
constraint is the four-connection pool, which is why §9.2 matters (the Overview drops from
sixteen queries in four rounds to about eight in two). The first query ticket measures each
primitive against the seed fixture and writes the numbers into the integration tests as
assertions with 50% headroom. Two more items in that ticket: a partial index for the
`prop_key` breakdown's `jsonb_object_keys` lateral join (`(site_id, ts) where event = 'custom'`),
and an explicit per-screen statement timeout through `run()` (1.5 s, not its 30 s default) so
an over-budget query fails its section instead of holding a connection.

## 10. Data loading

- Every screen is a server component that reads the URL state, authorises the site, builds
  the context and calls one `getXScreen(ctx, state)` function in `lib/screens/<x>.ts`. That
  function starts every query at once and returns an object whose sections are promises, each
  already settled to `{ok: true, data} | {ok: false, name}` by a `settle()` helper at creation
  time, so no promise ever rejects across the boundary and no unhandled rejection can occur on
  the server. Nothing else on the server talks to `lib/query`.
- Each section is awaited inside its own small server component under its own Suspense
  boundary, and hands the plain data to a client component for interaction. Promises are not
  passed into client components: React 19 allows it with `use()`, but a rejection would then
  only be catchable by an error boundary that takes the whole route, which defeats "the rest
  of the screen still renders".
- Streaming: the KPI strip and the lead chart are one boundary, tables another, so the numbers
  paint first. `loading.tsx` per route renders the same layout as skeletons. While a section
  is pending it carries `aria-busy="true"`; after 5 s one page-level polite "Still loading
  pages…" is announced, once. A section that exceeds its timeout resolves to the error state,
  never a skeleton that stays forever. If the compare query fails and the primary succeeds,
  the section renders without deltas and says so in one line.
- Client components receive data as props and own only interaction: chips, sort, selection,
  hover. State changes push a URL through the router inside `useTransition`. The pending state
  dims chart and table containers to 0.7 opacity with `pointer-events: none`, keeps text at
  full opacity (dimmed text drops below AA), sets `aria-busy`, and shows a 2 px accent
  progress rule at the top of the region as the non-colour signal. No client cache.
- Polls (Realtime, onboarding) hit `/api/live/[site]`, a Route Handler that verifies the
  session itself and is excluded from `proxy.ts`'s matcher, so a 10-second poll does not pay
  the auth proxy's Supabase round trip on every tick. The handler returns a discriminated
  result; on `unauthenticated` the poll stops and a non-modal `role="status"` banner offers
  "Session expired, sign in" with `redirectTo` carrying the current URL including chips. It
  never redirects out from under a scrolled page and never blanks rendered data.
- Pool: `max: 4` (TICKET-023). If the 12-month range is still over budget after §9.2, the next
  lever is a daily rollup table refreshed by `housekeeping()`, decided then.

## 11. Schema

One migration, shipped whole in the query ticket before any screen reads it:

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
alter table public.goals enable row level security;
revoke all on public.goals from anon, authenticated;   -- the default privilege grants them; goals are read through postgres.js only
create policy "goals: owner all" on public.goals for all to authenticated
  using      (site_id in (select id from public.websites where user_id = auth.uid()))
  with check (site_id in (select id from public.websites where user_id = auth.uid()));

alter table analytics.site_settings
  add column kpi_goal_id      bigint references public.goals(id) on delete set null,
  add column retention_months smallint not null default 24,
  add column breakpoints      smallint[] not null default '{640,1024,1280}',
  add column shortcuts        boolean not null default true;

alter table analytics.events
  add column viewport_width  smallint not null default 0,
  add column viewport_height smallint not null default 0;

create index events_site_received on analytics.events (site_id, received_at);
create index events_site_ts_custom on analytics.events (site_id, ts) where event = 'custom';

alter table public.websites drop column is_first_visit;
```

`websites` policies are `user_id = auth.uid()`; goals have no `user_id`, so their policy is
site-scoped as above, kept for defence in depth even though the app reads them through the
pooler. `housekeeping()` deletes soft-deleted sites' rows; `goals` cascades with them.
`site_settings` has no row for most sites (`authorize.ts` defaults the timezone on a miss), so
every settings write is an upsert. The tracker sends `vw` and `vh`; the zod schema, `rows.ts`,
`EVENT_COLUMNS` and the seed generator gain the two columns.

Test infrastructure, fixed in the same ticket: `tests/setup/database.ts` applies post-dump
migrations only when the `analytics` schema is absent, so on a warm container a new migration
never runs and the tests pass against the old schema. It gains a ledger,
`analytics.schema_migrations(version)`, applies whatever is missing, and
`DUMP_INCLUDES_MIGRATIONS_THROUGH` is bumped whenever `schema.sql` is re-exported.

## 12. States

- Loading: skeletons matching the final layout; never a spinner in the page body. Sections
  carry `aria-busy` while pending (§10).
- Empty: one sentence naming what would fill the space and, where it applies, the action
  ("No events yet. Track one with `lynq.track('signup')`."). Tables show their header and the
  sentence, charts show their axes.
- No data at all for the site: the Overview shows the onboarding step 2 panel inline.
- Data exists but not in this range: "Nothing between Aug 6 and Sep 4." If the range ends
  before the first event: "Your first event is on Sep 12" with a "Jump to the first day with
  data" link.
- Error: the section that failed shows its title, "Couldn't load this", and a retry link;
  the rest of the screen still renders. Errors are logged with the screen and query name.
- Filtered to nothing: the chips stay, the empty sentence says "Nothing matches these
  filters", and Clear all is offered.
- Too little data for the lead view: a treemap with fewer than 4 pages, a quadrant with fewer
  than 3 sources, a heatmap with fewer than 30 sessions, a histogram with fewer than 50
  samples, a funnel with fewer than 10 sessions at its first step; and too little width: a
  treemap under 600 px or a heatmap under 700 px. In every case the lead view is not rendered
  and one sentence names the threshold ("The treemap appears once four or more pages have
  visitors"); the screen's table stays where it is, nothing is duplicated. Thresholds are
  constants beside each chart and tested.
- Zero denominators render "—", never `NaN%` or `0%` (bounce rate with no sessions,
  conversion with no visitors, revenue per visitor with none).
- Auth expiry and lost ownership: §10 and §4.

## 13. Responsive and accessibility

- 1000 px and below: top nav becomes a scrolling row (§4); controls wrap; secondary table
  columns hide (§6); the treemap and heatmap keep full width down to their width thresholds
  (§12).
- 640 px and below: nav collapses to three items plus More; the heatmap buckets to 3-hour
  columns; the flow panel stacks came-from above went-to.
- 480 px and below: the KPI strip becomes one snapping row (§6).
- Touch targets: chips' ×, row Filter buttons, chart marks and heatmap cells all present at
  least 24 × 24 px (2.5.8): transparent hit rectangles on marks, 32 px tap areas on row
  buttons.
- Keyboard: every row, mark, chip and control is reachable in the patterns of §6 and §7;
  shortcuts are scoped and switchable (§6).
- Colour is never the only signal: badges carry ▲ ▼, pills carry text, the heatmap and
  treemap have values in their names and their tables; pending state has a progress rule.
- Contrast: every token pair in §3 is measured and passes AA at the size it is used; chart
  labels are always `--ink`; the second and third series are separated by gaps and named.
- Reduced motion: §3.
- The globe (`globe-card.tsx`) is removed, not restyled: drag-only rotation with no
  single-pointer alternative fails 2.5.7 and a canvas has no accessible equivalent. ECharts
  charts sit `aria-hidden` behind their description and table (§7).

## 14. Charting decision (proposed D-009)

The owner's call: charts come from a library. Options:

- **Apache ECharts** (chosen). Covers the whole inventory (line, bar, scatter with bubbles,
  treemap, heatmap, histogram as bars, dot plot as scatter) and Phase 2's Sankey, funnel and
  calendar. Theming is one object derived from the tokens. Tooltips, legends, brush zoom and
  `aria` descriptions are built in. SVG renderer available. Costs: renders client-side after
  hydration (charts paint over fixed-height skeletons, not in the server HTML); about 200 KB
  gzipped after tree-shaking; marks are not keyboard-focusable, so the table equivalent is the
  accessible path (rule 8).
- **Nivo**. React components, SVG that can render on the server, treemap, heatmap, scatter,
  line and bar present, themeable. Weaker interaction and accessibility, heavier per-chart
  packages with overlapping d3 dependencies, no Sankey of ECharts' quality for the paths
  screen later. Second choice.
- **Recharts** (current, 2.15; 3.x supports React 19). Line, bar, scatter and treemap; no
  heatmap or dot plot without faking them from scatter; its animation caught the walkthrough
  screenshots mid-draw. Rejected.
- **visx** and **hand-written SVG**. Rejected by the owner: "let's not do hand-written charts,
  we should use a library".

Consequence: Recharts and `components/ui/chart.tsx` are removed with the old dashboard;
ECharts is added in the chart ticket with a wrapper, a theme and per-chart option builders.

## 15. What the old dashboard leaves behind

Deleted with the Overview ticket unless noted: `cobe` and `globe-card.tsx`; `recharts` and
`components/ui/chart.tsx`; `framer-motion` and `tailwindcss-animate` (and its entry in
`tailwind.config.ts`); `filter-context.tsx`, `filter-chips.tsx`, `share-bar-list.tsx`,
`metric-card.tsx`, `analytics-*.tsx`, `data-card.tsx`, `date-picker.tsx`, `nav-tabs.tsx`,
`event-*.tsx`, `performance-dashboard.tsx`, `core-vital-card.tsx`, `setup-dialog.tsx`,
`website-dashboard.tsx`; `lib/dashboard.ts`, `lib/dashboard-types.ts`, the global
`DatePickerValues` type and `constants.ts`'s `datePickerValues`; Satoshi and CalSans (§3);
`websites.is_first_visit` (§11). The `is_first_visit` guest skip in `page.tsx` goes with the
column; the guest write guard in `lib/actions.ts` stays and extends to the new actions (§4).
`proxy.ts` needs no change for the nine routes; `/api/live` joins its negative lookahead.

## 16. Implementation sequence

Tickets, each one commit-able unit, in this order. Every screen ticket ships under the new
route; `/dashboard` keeps working until `/sites` replaces it.

1. **Tokens**: globals, Tailwind theme, Geist, font removal, body class scoped to `(main)`,
   reduced-motion block. No components.
2. **URL state**: `lib/url-state.ts` with unit tests for round-trips and every malformed
   input. No UI.
3. **Shell, part one**: TopNav, PageHeader, Controls, RangePicker, ComparePicker, chips,
   `+ Filter`, the shortcut sheet and scoping, the page `role="status"` region.
4. **Shell, part two**: KpiStrip, Section, DataTable (all §6 semantics, roving rows, Filter
   button, drawer), Badge, Pill, RowBar, skeletons, and a development-only preview route
   `/(dev)/ui`.
5. **ECharts foundation**: dependency, `echarts/core` registration, the `lynq` theme from
   the tokens, the `<Chart>` client component (instance, resize, dispose, click and hover
   callbacks, reduced motion, aria), the dynamic import, the bundle measurement; line, bar and
   sparkline option builders with unit tests and their hidden-table equivalents.
6. **Shape charts and HTML views**: treemap, quadrant, heatmap, histogram and dot plot option
   builders with their table equivalents and width thresholds; FlowPanel, Funnel, PathList,
   Matrix, SplitBar in HTML.
7. **TICKET-027**: session-entry dimensions (§9.1). Its own ticket, already filed.
8. **Query additions and the migration**: §9.2 to §9.10 and the whole of §11, including the
   tracker's `vw`/`vh`, the test ledger, the timing harness and the budget assertions, the
   `prop_key` index and the per-screen timeout.
9. **Overview** on the new shell, replacing `/[site]`; §15 deletions.
10. **Sites list and site switcher** (`/sites`, redirect from `/dashboard`).
11. **Pages**. 12. **Sources**. 13. **Locations**. 14. **Devices**. 15. **Events** and the
    session drawer. 16. **Goals** and the goal form. 17. **Performance**.
18. **Live route and Realtime** (`/api/live`, polling rules, pause).
19. **Settings** with upserts and the diagnostics panel.
20. **Onboarding**.
21. **Accessibility and responsive pass** across all screens with a screen reader and at
    375 px, then the e2e suite gains one flow per screen.

## 17. Owner decisions requested

1. Sign off on this design as the basis for the tickets in §16.
2. D-009, the charting decision (§14): Apache ECharts as the one chart library, Recharts
   removed; Nivo is the alternative if server-rendered SVG matters more than ECharts' range.
3. The tracker change for viewport size (§8.6, §11): a small tracker, ingest and schema change
   inside Phase 1, so the Devices histogram measures what it claims to.

## 18. Review record

Three review passes on 2026-09-05, each an Opus agent working from the repository:

- **Pass 1, design and information architecture**: 14 findings, all folded into v2. The
  largest: the KPI concept had no defined behaviour without a goal or revenue (§8.0); select
  and filter were one click with two meanings (rule 7); session and row chips looked the same
  (§5); one `view` param could not express three tables (§5); Realtime on the wrong clock
  (§8.2); no delta column in tables (§6); no thin-data fallbacks (§12); onboarding had no
  failure branch and ignored `ingest_log` (§8.11); a contrast claim was wrong (§3); the session
  timeline had no route (§4); three drifts from D-008 (§2, §3, §6); no sessions tile (§8.1);
  saved segments had vanished (§1).
- **Pass 2, implementation feasibility**: 16 findings, all folded into v3. The largest: the
  test setup would never apply a new migration (§11); the goals policy as written was
  unimplementable and PostgREST-exposed (§11); entry dimensions could not use `min()` (§9.1);
  a single GROUP BY cannot mix row and session metrics (§9.2); three sequencing inversions and
  two oversized tickets (§16); promises should be awaited in server children, not passed to
  clients (§10); the realtime index and session-chip composition (§9.4); page flow and paths
  needed loop collapsing and bounding (§9.5, §9.9); the "viewport" histogram measured the
  screen (§8.6); URL-state edge cases and the proxy cost of polling (§5, §10); the server
  render width jump (§7); a list of things the old dashboard leaves behind (§15).
- **Pass 3, accessibility, interaction, responsive, states**: 12 findings, all folded into v3.
  The largest: the shortcut set violated WCAG 2.1.4 (§6); Realtime had no pause and the feed
  would have been a live region (§8.2); no ARIA pattern for any chart (§7); §7 and rule 7
  contradicted each other; table semantics were unspecified and the hover-only Filter
  affordance was unreachable (§6); four colour pairs failed AA (§3); drawers and the calendar
  had no focus specification (§6); chips, the filter popover and the KPI tile needed defined
  roles (§6); four responsive breakages at 375 px (§13); five missing states (§12); pending
  dimming was a colour-only signal (§10); no reduced-motion handling (§3).
