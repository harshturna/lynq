# TICKET-038: Sources screen

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
/[site]/sources renders the KPI strip in its three states, the quadrant, and the Channels, Sources/Referrers and Campaigns tables on session-entry attribution.

## Context
- Design §8.0, §8.4, §9.1 (TICKET-027), §9.2 (revenue, payments, goal metrics). Depends on TICKET-033, TICKET-034, TICKET-035. Removes the synthetic Direct row added in TICKET-023.
- Read on start (2026-09-05): the approved mock is the "Sources" screen in the TICKET-025 set;
  built on the TICKET-037 pattern (screenContext, ScreenHeader, settled sections).
  lib/screens/sources.ts: the strip's four tiles per KPI state (§8.0 table; revenue and
  revenue per visitor need a site-wide revenue total, so lib/query/revenue.ts adds
  revenueQuery and run.ts revenue()); the quadrant from an entry_source breakdown with y as
  conversion when a KPI goal exists, else engaged time per session, and bubble size revenue,
  else completions, else visitors, with corner labels per axis; Channels (entry_channel),
  Sources / Referrers (entry_source, entry_referrer) and Campaigns (entry_utm_campaign,
  medium, term, content) tables with a client-side share column over the range's unique
  visitors and the goal and revenue columns by KPI state. KpiStrip gains a static mode (no
  radios) because nothing on this screen is driven by a tile. SectionError moves to
  components/shell for every screen. The synthetic Direct row the ticket mentions was
  already removed by TICKET-027.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] lib/screens/sources.ts; route; quadrant with the KPI-state fallback; three tables.
- [x] Verify: npm run verify; integration; guest walk-through.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; Context brought up to date.
- 2026-09-05 — Landed. Walk-through finding, fixed: the Campaigns table's Medium view led with an
  "Unknown" row because the multi-metric builder keeps '' for every entry dimension; '' is
  Direct for referrer, source and channel but the absence of a value for UTM fields, so
  entry_utm_* drop it now (lib/query/breakdown.ts).

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed; next is TICKET-039 (Locations).
- **Blocked on:** nothing.
- **Next:** TICKET-039.
- **Read first:** lib/screens/sources.ts (KPI-state strip and quadrant).

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:integration
```
verify: lint, typecheck, ticket check, 32 files / 150 unit tests. Integration 6 files / 36
tests (new: revenue and payments over the range, with a filter). Guest walk-through on
`next dev -p 3005` at 1280 and 390 px on aivia (no KPI goal, revenue present): strip with
visitors, sessions, bounce in points and engaged time; the quadrant on engaged time with the
site-average line and corner labels; Channels, Sources and Campaigns with share and revenue
columns and one change slot on the sorted column; Referrers and Medium tabs write
`view.sources=referrers` and `view.campaigns=medium` and swap the rows; no failed sections,
no console errors; at 390 the quadrant renders and the secondary columns hide.

## Outcome
Shipped: /[site]/sources per §8.4 and §8.0 with lib/screens/sources.ts, the revenue
primitive, KpiStrip's static mode, SectionError shared in components/shell, and the UTM
empty-value rule. The goal and revenue strip states render from the same code once a KPI
goal exists (TICKET-042 adds goals). Left out: the mock's "source / medium" column on
Campaigns, which needs the two-dimension breakdown and adds a column the table does not
need. No follow-up tickets.
