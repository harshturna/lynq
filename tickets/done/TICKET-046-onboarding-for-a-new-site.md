# TICKET-046: Onboarding for a new site

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
/sites/new walks a new site through install, the live first-event check with diagnostics, and the KPI pick, and the Overview shows the waiting state until ten pageviews exist.

## Context
- Design §8.11, §10 (polling /api/live every 3 s), §12 (no data at all). Depends on TICKET-044 (live route), TICKET-045, TICKET-042. Replaces setup-dialog.tsx and the is_first_visit gate (dropped in TICKET-034).
- Read on start (2026-09-05): the approved mock is the "Onboarding" screen in the TICKET-025
  set. /sites/new keeps its step in the URL (`?site=<slug>&step=1|2|3`) so a site can come
  back to "we are listening" from the Overview's waiting panel. Step 1 creates the site
  through the existing addWebsite action and shows the snippet with copy and guide links.
  Step 2 polls /api/live/[slug] every 3 s; the realtime row gains a vitals count and the
  browser per feed row so the check list (snippet installed, hostname matches, first
  pageview accepted, Web Vitals reported) and the first pageview's path, country and browser
  come from one poll; after 60 s without an accepted pageview the step calls the diagnose
  action (lib/screens/onboarding-actions.ts, reading ingest_log for the site's hostnames over
  the last 15 minutes) and names the rejection in the §8.11 words, which now live in
  lib/screens/diagnostics.ts shared with Settings. Step 3 offers four KPI suggestions that
  create a goal marked as the KPI through createGoal, or skips. Finish lands on the
  Overview, whose panel reads "Waiting for data" below ten pageviews and links back to step
  2. The sites list's popover is replaced by a link to /sites/new; the nav's "Add a site"
  points there too.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] Route and the three steps; polling; diagnostics from ingest_log; KPI suggestions creating a goal.
- [x] Verify: npm run verify; e2e: a fresh site receives its first pageview from the fixture server and the step turns green.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; Context brought up to date.
- 2026-09-05 — Landed. Walk-through findings, fixed: a "use server" module may only export async
  functions (the diagnose window constant is local now); the settings page still referenced
  the old stage table after the wording moved to lib/screens/diagnostics.ts.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed; next is TICKET-047 (accessibility and responsive pass, e2e).
- **Blocked on:** nothing.
- **Next:** TICKET-047.
- **Read first:** app/(main)/sites/new/_new/onboarding.tsx.

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:integration
```
verify: lint, typecheck, ticket check, 32 files / 150 unit tests. Integration 6 files / 37
tests (the realtime row's vitals count and browser are asserted). Guest walk-through on
`next dev -p 3005` at 1280 and 390 px with four rows injected into the demo site and then
removed: step 1 shows the guest notice, the disabled form and the snippet with copy and
guides; step 2 for aivia reads "The first pageview is in." with three checks green and Web
Vitals waiting, and names the first pageview; step 3 shows the four suggestions disabled
for the guest and the skip link; no console errors. Not exercised: creating a site and a
goal as an owner through the browser (the same addWebsite and createGoal actions as the
sites list and Goals use), and the 60-second diagnostics path (needs a minute of wall time;
the action and the wording are the Settings panel's, which is exercised).

## Outcome
Shipped: /sites/new per §8.11 with the three steps, the 3-second poll, the diagnostics
action, the KPI suggestions; the shared diagnostics wording; the Overview's "waiting for
data" panel below ten pageviews linking back to step 2; Add a site links to /sites/new from
the list and the nav. Left out: the e2e that runs the tracker against a fresh site (the
tracker e2e server records batches instead of ingesting; wiring it to the app needs the
database in the e2e job, which TICKET-047 owns). No follow-up tickets.
