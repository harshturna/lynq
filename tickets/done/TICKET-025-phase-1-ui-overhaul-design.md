# TICKET-025: Phase 1 design: the app shell and overview

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
A reviewed design for the UI overhaul (roadmap Phase 1) in the direction chosen in D-008: light-only tokens, top-navigation shell with site switcher, range picker, compare and URL-synced filters, the Overview / Pages / Sources / Locations / Devices / Realtime / Performance screens, and onboarding.

## Context
- Roadmap artifact (UI overhaul section and Phase 1); D-001; the query layer's actual surface in
  lib/query after TICKET-023.
- Screen mockups (all Phase 1 screens, D-008 style):
  https://claude.ai/code/artifact/6b345ac7-a975-478b-8796-2153c3b37bf4
- **Visual direction is decided: D-008.** Owner-approved mockup of the Overview, with the other
  directions kept for reference: https://claude.ai/code/artifact/25f864fe-6a61-480a-965e-c3404eb7657f
  (tab "Ledger + Studio", accent Teal). Source file for that page is not in the repo; the design
  doc carries the tokens. Tokens: canvas #ffffff, ink #0a0a0a, ink-2 #4a4a52, mute #8a8a93,
  rule #e8e8ec, rule-strong #111111, soft #f5f5f7, accent teal #0f766e / ink #0b5f59 / soft
  #e3f1ef, good #0f7b3e / #e1f3e8, warn #a36a00 / #fbefd2, poor #c7261f / #fbe4e2, compare line
  dotted grey; type Geist 400/500/600 (Google Fonts), tabular numerals; radii 4-6px, no shadows.
  Layout: top nav (Overview, Realtime, Pages, Sources, Locations, Devices, Events, Goals,
  Performance; Settings and site switcher on the right), title with live count and range
  subtitle, controls right-aligned (range, compare, filter chips as grey rectangles, + Filter,
  dark Share button), KPI strip of five with rule separators and delta badges, chart 2/3 with a
  right column (goal card with funnel, devices split), three tables with segmented captions
  (Top/Entry/Exit etc.), Web Vitals strip with status pills.
- Owner's taste, from the review: minimalist, "tasteful", no purple, personality through badges,
  flags and small visualisations rather than colour or cards. The roadmap's sidebar shell and
  choropleth are superseded by D-008's top nav; the globe is retired.
- Light only; no theme toggle (D-008).
- Same method as Phase 0: written design, Opus reviews, revisions, owner sign-off, then
  implementation tickets. Charting library decision (ECharts vs alternatives) is an expensive-
  to-reverse choice and gets a D-NNN.
- Depends on TICKET-023 and TICKET-024.
- Load time to design for (measured in TICKET-023 on the 12-month range against production):
  getDashboard() fans out ~16 queries, ~1.5 s of database time with four pooled connections
  and ~2.5 s end to end for a range change. The new data loading (per-card fetching, caching,
  fewer round trips) is part of this design, not a separate ticket.

## Plan
- [x] Mock the remaining screens in the D-008 style on the same artifact page (Realtime, Pages,
      Sources, Locations, Devices, Events, Goals, Performance, Settings, onboarding) and get the
      owner's reaction before writing.
- [x] Write docs/design/phase-1-ui-overhaul.md: tokens, component inventory, screen specs,
      URL state, data loading, empty and loading states, responsive behaviour.
- [x] Review passes (design, information architecture, accessibility, implementation).
- [x] Owner sign-off; decisions recorded; implementation tickets opened.

## Progress log
- 2026-09-05 — Created (D-007, Phase 1 opening).
- 2026-09-05 — Visual direction chosen by the owner after four mocked directions: D-008. Plan now
  starts with mocking the remaining screens in that style.
- 2026-09-05 — Started. Built the screen mockups as one artifact page ("Lynq Screens") with a
  tab per screen: Realtime, Pages, Sources, Locations, Devices, Events, Goals, Performance,
  Settings, Onboarding. Same sample data family as the approved overview. Published for the
  owner's reaction. Choices made in the mocks that the design doc must carry or revisit:
  Pages is one wide sortable table with a detail panel for the selected page (trend, entry
  sources, vitals, goals); Sources shows the KPI and revenue per visitor as columns and a
  stacked channel chart; Locations drills country › region › city in three tables plus
  languages and time-of-day; Devices nests browser versions under the browser; Events pairs
  the volume table with a per-event trend, property breakdowns and a recent list; Goals lists
  goals with the ★ KPI and a per-goal panel; Performance has a p75 strip, an LCP-by-device
  chart with the 2.5 s threshold, a worst-first page table and a "what is slow" panel;
  Settings is a single scrolling page with a sub-nav; Onboarding is a three-step flow with a
  live first-event check and the KPI pick.
- 2026-09-05 — Owner: likes it overall but the screens repeat the same components; asked for
  variety and "use the data in interesting ways". Each screen now has a signature view built
  from its own data shape: Pages a treemap (area visitors, shade engaged time) and a flow panel
  (came from › page › went to next); Sources a quadrant plot (visitors × conversion, bubble =
  revenue, labelled scale / winning / watch / fix the landing page); Locations a country × hour
  heatmap; Devices a viewport-width histogram with CSS breakpoints and a browser × OS matrix;
  Events the top paths that end in the event; Goals a funnel with drop-off and a conversion
  dot plot against the site average; Performance an LCP distribution with the three bands.
  Line charts stay on Overview, Realtime and as small trends. These are the chart types the
  charting-library decision must cover.
- 2026-09-05 — Owner approved the direction ("some components look a bit messy but likely
  because it's a mockup, overall I am liking the direction we can proceed"). Landing page is
  explicitly later (needs graphics). docs/design/phase-1-ui-overhaul.md v1 written: tokens,
  routes, URL state, shell, chart inventory, ten screens, query additions, schema, states,
  responsive, charting decision (proposed D-009: hand-written SVG, drop Recharts), sequence
  of 15 implementation tickets, open questions. Review passes start: 1 design/IA, 2
  implementation feasibility, 3 accessibility/states/responsive.
- 2026-09-05 — Pass 1 (14 findings) folded into v2. Passes 2 (16 findings) and 3 (12
  findings) ran in parallel after the owner asked why agents were sequential (CLAUDE.md rule
  corrected) and are folded into v3: settled section promises awaited in server children,
  two-CTE multi-metric breakdown, entry dimensions via array_agg, goals RLS site-scoped and
  revoked from PostgREST, migration ledger for the test container, viewport width added to the
  tracker, /api/live route outside the auth proxy, normalised-viewBox charts with HTML text,
  full ARIA contract per chart type, table semantics, scoped shortcuts, contrast fixes to four
  tokens, drawer focus and history rules, responsive fixes, missing states. Sequence is now 21
  tickets. v3 is ready for owner sign-off with three decisions requested (§17).
- 2026-09-05 — Owner: "let's not do hand-written charts, we should use library." v4: §7 and
  §14 rewritten for Apache ECharts (SVG renderer, one theme from the tokens, one <Chart>
  client component, option builders per chart, aria descriptions plus table equivalents as
  the accessible path; Nivo the alternative); §16 tickets 5 and 6 re-scoped. D-009 will
  record ECharts on sign-off.
- 2026-09-05 — Owner: "go for it" to all three decisions. D-009 recorded (ECharts). The
  viewport-size tracker change is routine and lives in TICKET-034. Twenty implementation
  tickets opened, TICKET-028 to TICKET-047, with TICKET-027 as step 7 of the sequence; each
  cites its design sections and its dependencies. Closing.

## Handoff
Closed; the sequence continues in TICKET-028.

## Verification
```
docs/design/phase-1-ui-overhaul.md   v4, 2026-09-05
review pass 1 (Opus, design/IA)           14 findings, folded into v2
review pass 2 (Opus, feasibility)         16 findings, folded into v3
review pass 3 (Opus, accessibility)       12 findings, folded into v3
owner                                     direction approved on the mockups; "go for it" on sign-off, D-009 and the viewport change
npm run check:tickets                     Ticket check passed
npm run verify                            lint, typecheck, tickets, unit tests pass (no code changed by this ticket)
```

## Outcome
Shipped: the Phase 1 design, docs/design/phase-1-ui-overhaul.md v4 (tokens with measured
contrast, routes, URL state, shell, ECharts charting, ten screens with data needs and states,
ten query additions with SQL shapes, the schema migration, data loading, responsive and
accessibility contracts, 21-step sequence, review record); two mockup artifacts (overview
directions, all screens); D-008 (direction) and D-009 (ECharts). Twenty implementation
tickets opened, TICKET-028 to TICKET-047, plus TICKET-027 already filed. Left out: the
landing page (owner: later, needs graphics) and saved segments (right after the screens).
