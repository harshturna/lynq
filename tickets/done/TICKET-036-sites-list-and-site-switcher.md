# TICKET-036: Sites list and site switcher

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
/sites lists the user's sites as a table with 30-day visitors, KPI completions, last event and a status pill; /dashboard redirects to it; the site switcher in TopNav targets it.

## Context
- Design §8.12, §4. Depends on TICKET-035. lib/query/site-visitors.ts (TICKET-024) becomes the per-site query with sparkline buckets, KPI completions and last event time.
- Add a site links to /sites/new (TICKET-046); until then it links to the existing setup flow.
- Read on start (2026-09-05): no mock of this screen existed in the TICKET-025 set, so one was
  made and approved first (https://claude.ai/code/artifact/00eaced5-7bca-4f12-ba90-8617a5d501b0):
  a bar with only the wordmark, Docs and the account; one row per site with name and
  hostname, 30-day visitors with the change in a slot (D-010), a sparkline, KPI completions
  or a "set" link, last event, a status pill (receiving data / nothing for N days / no data
  yet); the row menu renames or deletes; "Add a site" is a popover with name and hostname
  that goes straight to the new site's Overview, whose no-data panel shows the snippet until
  TICKET-046 builds /sites/new. lib/query/site-visitors.ts becomes lib/query/sites.ts
  (siteStats: visitors and the 30 days before, a daily series, last received_at through
  one index probe per site, KPI completions per site with a goal). lib/screens/sites.ts
  builds the rows. The account avatar menu is extracted from TopNav into
  components/shell/account-menu.tsx and gains "All sites". /dashboard, the login, sign-up,
  landing CTA and middleware targets all point at /sites; the old dashboard components,
  components/header.tsx, bottom-gradient.tsx and the sidebar constants are deleted.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] lib/screens/sites.ts; app/(main)/sites/page.tsx; redirect from /dashboard; switcher wiring.
- [x] Verify: npm run verify; npm run test:integration; guest walk-through.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Mock approved; started.
- 2026-09-05 — Landed as described in Context. Walk-through findings: Radix's Popover trigger did not
  open through the shell's Control component (the add-site button is a plain button now);
  the KPI column hides under 640 px so the hostname keeps its room; siteStatus moved to
  lib/query/site-status.ts because lib/query/sites.ts imports the pool and the unit runner
  cannot load it; the landing page still imports constants.ts, so only sidePanelItems was
  removed from it.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed; next is TICKET-037 (Pages screen).
- **Blocked on:** nothing.
- **Next:** TICKET-037.
- **Read first:** lib/screens/sites.ts; app/(main)/sites/_components/sites-table.tsx.

## Verification
```
npm run verify
```
lint (25 pre-existing warnings), typecheck, ticket check, 32 files / 150 unit tests passed
(new: fmtAgo, siteStatus). lib/query changed only by addition (sites.ts, site-status.ts)
and site-visitors.ts was removed; the integration suite is unaffected and was last run green
on TICKET-035. Guest walk-through on `next dev -p 3005` at 1280 and 390 px: two rows with
visitors, change slot, sparkline, "set" KPI link, last event, Receiving data pills; the
add-site popover and the row menu open and show the guest notice; /dashboard redirects to
/sites; the account menu lists All sites, Site settings and Sign out; no console errors.

## Outcome
Shipped: /sites as the list with per-site stats, add, rename and delete; /dashboard, login,
sign-up, landing CTA and middleware point at /sites; the account menu shared between the
site shell and the list; the old dashboard list, header, sidebar and card deleted. Left out:
/sites/new (TICKET-046); the nav's "Add a site" opens the popover through `/sites?add`
until then. No follow-up tickets.
