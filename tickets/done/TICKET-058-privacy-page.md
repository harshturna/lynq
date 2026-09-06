# TICKET-058: Privacy page

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
A /privacy page on the light base that says, in plain words, what Lynq stores about a visit
and what it never stores, matching the landing page's ledger and the claims in
docs/design/phase-0-data-foundation.md.

## Context
- The landing page's footer (TICKET-057) links to /privacy; the route does not exist yet.
- The claims must stay literally true (Phase 0 §privacy): no cookies, the daily-rotating
  visitor salt (D-003), hashed ids from lynq.identify, Global Privacy Control honoured,
  retention default 24 months and owner-adjustable.
- Same shell as the landing page: app/(landing)/_landing/nav.tsx and closing.tsx.

## Plan
- [x] app/(landing)/privacy/page.tsx with the ledger and one section per claim.
- [x] e2e: route loads, axe clean.
- [x] Verify: npm run verify; test:e2e.

## Progress log
- 2026-09-06 — Created from TICKET-057.
- 2026-09-06 — Landed. The ledger moved out of the landing's privacy section into _landing/ledger.tsx so both pages share it. The Supabase middleware redirected every path but /, /login and /sign-up to the login page; /privacy is public now. Two facts corrected while writing: the row stores the page's query string too, and there is no contact address to publish yet, so the page points at the docs.

## Handoff
- **State:** Closed.
- **Blocked on:** nothing
- **Next:** TICKET-049
- **Read first:** app/(landing)/_landing/privacy.tsx

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npx playwright test landing.spec --project=app
```
verify: 33 files / 149 unit tests. Landing spec: 8 passed, including the new privacy check
(heading, no sideways scroll, axe clean). Screenshot at 1280 reviewed; every sentence checked
against lib/ingest/collect.ts, the tracker's index.ts, the analytics schema's housekeeping,
D-003 and D-005.

## Outcome
Shipped: /privacy on the light base, seven short sections and the shared ledger. Left out: a
contact address (none exists to publish). No follow-up tickets.
