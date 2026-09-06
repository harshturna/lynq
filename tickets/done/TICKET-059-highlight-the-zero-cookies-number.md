# TICKET-059: Highlight the zero-cookies number

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
In the landing page's numbers row, the "0" of "0 cookies" carries the same teal highlight as
the hero's marked phrases, so the one claim that matters most reads first.

## Context
- Owner, 2026-09-06, after TICKET-057 landed. app/(landing)/_landing/privacy.tsx renders the
  four numbers; the hero's `Mark` is the same teal-soft background.

## Plan
- [x] Mark the 0; look at it; verify.

## Progress log
- 2026-09-06 — Created, started, landed.

## Handoff
- **State:** Closed.
- **Blocked on:** nothing
- **Next:** —
- **Read first:** app/(landing)/_landing/privacy.tsx

## Verification
```
npm run verify
```
verify: lint, typecheck, ticket check, 149 unit tests. Screenshot of the numbers row reviewed.

## Outcome
Shipped: the highlighted zero. Nothing left out.
