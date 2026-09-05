# TICKET-020: Transition, diff and Phase 0 close-out

**Status:** in-progress
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** —
**Area:** infra

## Goal
Run v1 and v2 side by side on Lynq's own site for a day, diff the stores, and close Phase 0 with an attributed report.

## Context
- Design §11 (steps and what is reported vs gated).
- Depends on every other Phase 0 ticket.
- The old-table side reads directly with no row cap; visitors are count(distinct client_id) from
  sessions.

## Plan
- [ ] `scripts/diff-events.mjs` per §11 step 3, including suspect counts, ingest_log counts by stage,
      and count(*) filter (where path = '').
- [ ] Add the v2 snippet to Lynq's own site alongside v1 for a day.
- [ ] Close-out report in this ticket's Outcome: every discrepancy attributed; the cutover date
      recorded for the Phase 2 annotations table. Verify: the diff run.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).
- 2026-09-05 — Started. Lynq's own domain was never a registered site and never carried the v1
  script, so "both snippets on Lynq's site" means adding both now: v1 for the comparison
  window, v2 as the product. Registered lynq.byharsh.com under the guest account so the demo
  dashboard shows real traffic. Dual-run conflict found and fixed: the v1 script assigns
  window.lynq unconditionally and the v2 core used that as its "already loaded" marker, so v2
  would have bailed; it now keys on window.__lynq. Backfill-day diff: page views match exactly;
  sessions and referrers differ by definition (session grain, day-rotating visitor).

## Handoff
- **State:** lynq.byharsh.com registered as site #41 under the guest user; app/layout.tsx carries
  the v2 snippet (with vitals, outbound and auto-events) and the v1 jsDelivr snippet for the
  comparison window, Vercel Analytics removed; the tracker core no longer bails when a v1 script
  owns window.lynq (it exposes window.__lynq and only claims window.lynq when free); chunk cache
  headers added; scripts/diff-events.ts (`npm run diff -- --site --day`).
- **Blocked on:** nothing
- **Next:** deploy, generate a few real visits, run the diff for today on both sites, write the
  close-out, close.
- **Read first:** scripts/diff-events.ts, app/layout.tsx

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
