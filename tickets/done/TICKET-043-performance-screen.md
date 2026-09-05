# TICKET-043: Performance screen

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
/[site]/performance renders the p75 strip with status and deltas, the device segment, LCP by device with the threshold, the worst-first page table, the what-is-slow panel and the LCP distribution.

## Context
- Design §8.9, §9.10 (vitalsBreakdown, vitals timeseries by device). Depends on TICKET-033, TICKET-034, TICKET-035.
- Read on start (2026-09-05): the approved mock is the "Performance" screen in the TICKET-025
  set. lib/screens/performance.ts: the device segment is the URL's `device` param applied as
  a filter to every section; the strip from vitals() with compare (lower is better, points
  off); LCP p75 per bucket by device from vitalsTimeseries (desktop ink, mobile teal, tablet
  grey; lineOption gains a "muted" colour) with the 2.5 s threshold; the pages table from
  vitalsBreakdown("path") sorted worst first by LCP with a status pill after each value; the
  selected page (sel) runs vitalsTargets on lcp_target and inp_target (a new query in
  lib/query/vitals.ts grouping the attribution columns with samples and p75) and
  vitalsBreakdown("country") sorted by LCP for the slowest countries; the LCP distribution
  from histogram("lcp") in 250 ms bins to 8 s with the good / needs work / poor tones and
  markers at 2.5 s and 4 s.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] lib/screens/performance.ts; route; strip; chart; table; panel; histogram.
- [x] Verify: npm run verify; integration; guest walk-through.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; Context brought up to date.
- 2026-09-05 — Landed. Walk-through finding, fixed: the client components imported constants from
  the server-only screen module (RENDERED, DEVICES, LCP bands), which Next refuses; they live
  in lib/vitals.ts now.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed; next is TICKET-044 (the live route and Realtime).
- **Blocked on:** nothing.
- **Next:** TICKET-044.
- **Read first:** lib/screens/performance.ts.

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:integration
```
verify: lint, typecheck, ticket check, 32 files / 150 unit tests. Integration 6 files / 37
tests (new: vitals attribution targets). Guest walk-through on `next dev -p 3005` at 1280
and 390 px: the strip reads LCP 2.6s needs work ▲0.8%, INP 228ms, CLS 0.08, FCP 1.4s, TTFB
479ms over 4,810 samples; LCP by device draws desktop, mobile and tablet against the 2.5 s
line; nineteen pages worst first with a pill after every value; Mobile writes
`device=mobile` and the strip re-reads 3.5s over 1,536 samples; Enter on the worst page
writes `sel=` and the slow panel shows the LCP element (h1, 5.5s poor), the INP target
(a.nav) and the four slowest countries; the distribution reads good 73%, needs work 20%,
poor 7% with markers at 2.5 s and 4 s; no failed sections, no console errors.

## Outcome
Shipped: /[site]/performance per §8.9 with lib/screens/performance.ts, the vitals targets
query and the muted line colour. Left out: nothing. No follow-up tickets.
