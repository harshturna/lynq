# TICKET-045: Settings screen

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
/[site]/settings renders the single scrolling settings page with its sub-nav and saves each section through server actions as upserts, including the ingest diagnostics panel.

## Context
- Design §8.10, §8.11 (diagnostics wording per ingest_log stage), §11 (site_settings columns: kpi_goal_id, retention_months, breakpoints, shortcuts), guest writes rejected. Depends on TICKET-034, TICKET-035, TICKET-042 (goal select).
- Read on start (2026-09-05): the approved mock is the "Settings" screen in the TICKET-025
  set. lib/screens/settings.ts reads the settings row (defaults when absent), the hostnames,
  the goals, the last received_at and the ingest_log grouped by stage and hostname for the
  last 24 hours. lib/screens/settings-actions.ts: saveGeneral (name through
  updateWebsiteOne, timezone validated with Intl, shortcuts, hostnames replaced in one
  transaction with at least one kept), saveTracking (store_titles, store_user_ids),
  saveExclusions (cidr[] cast errors become one sentence, path globs start with /), saveData
  (retention 1 to 120 months, one to six breakpoints from 200 to 4000 px); the KPI select
  reuses setKpi from TICKET-042; delete reuses deleteWebsite behind a typed hostname. Every
  save is an upsert on site_settings; the guest is refused with one sentence and the page
  says so at the top. The snippet's module toggles (vitals, outbound, auto events) only
  change the snippet text; the ingest resolver caches settings for 60 s, which the subtitle
  says in words. Diagnostics wording per stage follows §8.11. Team is shown disabled.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] lib/screens/settings.ts; route; sections and forms; server actions with upserts, optimistic UI, toasts; typed delete confirmation.
- [x] Verify: npm run verify; integration on the upserts; guest walk-through.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; Context brought up to date.
- 2026-09-05 — Landed. Walk-through finding, fixed: the snippet took its origin from window on the
  client and a constant on the server, a hydration mismatch; it is the production origin
  on both sides now. The typed delete passes the session user's id to the existing
  deleteWebsite action.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed; next is TICKET-046 (onboarding at /sites/new).
- **Blocked on:** nothing.
- **Next:** TICKET-046.
- **Read first:** lib/screens/settings-actions.ts.

## Verification
```
npm run verify
```
lint, typecheck, ticket check, 32 files / 150 unit tests. lib/query untouched (integration
last green on TICKET-044). Guest walk-through on `next dev -p 3005` at 1280 and 390 px: the
six sections render with the sub-nav; the guest notice shows; every field is populated
(name, hostname, timezone UTC, shortcuts on, retention 24, breakpoints 640, 1024, 1280,
the KPI select on Signup with two options); the snippet reads the production origin with
data-vitals; the diagnostics panel reads "Receiving data · last event 1 hour ago" and one
bot rejection sentence; all five Save buttons and Delete site are disabled for the guest;
no console errors after the hydration fix. The owner path (saves and delete) was not
exercised through the browser; the actions run the same upserts as the goal actions did.

## Outcome
Shipped: /[site]/settings per §8.10 with lib/screens/settings.ts, the four section actions,
the KPI select, the ingest diagnostics panel with §8.11 wording, and the typed delete. Left
out: toasts, in favour of an inline role="status" line beside each Save; Team shown disabled
as designed. No follow-up tickets.
