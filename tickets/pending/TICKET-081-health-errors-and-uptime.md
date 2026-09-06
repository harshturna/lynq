# TICKET-081: Health: JavaScript errors and uptime on the Performance screen

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
**Area:** feature

## Goal
The same script that says which element is slow says which page throws, and Lynq itself says whether the site is up: grouped JavaScript errors with affected sessions, and a per-minute uptime check with response time and incidents, both on the Performance screen, which becomes the site's health view.

## Context
- Owner, 2026-09-06: fold in the adjacent verticals that fit the single-script, no-third-party
  product; errors and uptime were the two picked. Both were foreseen: the roadmap's tracker
  modules list Errors, and phase-0 §4 reserved `event = 'error'` with "Phase 3 adds the
  columns with an alter table" (the check constraint on analytics.events.event must gain the
  value; a `payload text` column and a fingerprint in `props`).
- Errors module: an opt-in chunk (`data-errors` on the tag, like `data-vitals`) with
  `window.onerror` and `unhandledrejection`; message, source file, line, and a stack cut to
  a few kB; fingerprint = hash of message + top frame; one row per occurrence with the page's
  `pid`, so "affected sessions" and "which page" come from the existing columns. Never send
  the page's DOM or form values. Rate-limit per page load (say 10) so a loop cannot flood.
- Uptime: a scheduled worker (pg_cron exists for housekeeping; a Vercel cron route is the other
  option, decide in the design) fetches each live site's hostname every minute or five, stores
  status, response time and the failing reason in analytics.uptime_checks (site_id, ts, status,
  ms, error), and derives incidents (n consecutive failures) for markers on charts. No client
  cost. Sites opt in from settings, and the check runs from one region only, said plainly in
  the docs.
- Screen: Performance gains two sections: Errors (grouped table: message, first and last seen,
  occurrences, affected sessions, top page; a filter to sessions with that error) and Uptime
  (a 30-day strip of minutes, current status, p75 response, incidents list). Keep D-013's
  table rules; mock and look first (D-010).
- Query: an `errors(ctx)` breakdown over event = 'error' grouped by fingerprint; uptime
  from its own table, never through the events rollup.
- Landing and docs (rule 8): the Performance panel on the landing gains an error row and an
  uptime strip; docs: tracking/script-tag.mdx gets `data-errors`, a Using Lynq page on the
  Health view, the privacy page says what an error row contains.

## Plan
- [ ] Design section: the errors chunk contract, the uptime worker and table, the two sections' layout; mock.
- [ ] Decision (decide skill): where the uptime worker runs (pg_cron + pg_net, or a Vercel cron route).
- [ ] Migration: the event check gains 'error', payload column, uptime_checks table, settings switch.
- [ ] Tracker chunk lynq-errors.js with the size budget and tests in tests/e2e/tracker.spec.ts.
- [ ] Ingest: accept the error event, cap payload, fingerprint server-side too.
- [ ] Query primitives, screen sections, seed data for both, e2e spec.
- [ ] Landing panel rows and the three docs pages.
- [ ] Verify: npm run verify; npm run test:integration; npm run test:e2e.

## Progress log
- 2026-09-06 — Created from the verticals review.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** the design section and the worker decision
- **Next:** —
- **Read first:** packages/tracker/src/vitals.ts (the chunk pattern), lib/query/vitals.ts, app/(main)/[website_slug]/performance

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
