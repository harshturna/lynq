# TICKET-058: Privacy page

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
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
- [ ] app/(landing)/privacy/page.tsx with the ledger and one section per claim.
- [ ] e2e: route loads, axe clean.
- [ ] Verify: npm run verify; test:e2e.

## Progress log
- 2026-09-06 — Created from TICKET-057.

## Handoff
- **State:** not started
- **Blocked on:** nothing
- **Next:** write the page
- **Read first:** app/(landing)/_landing/privacy.tsx

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
