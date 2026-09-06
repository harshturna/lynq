# TICKET-063: Remove the highlight on the zero-cookies number

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
The four numbers on the landing page's privacy section read as one row again: no teal mark behind the "0" for cookies.

## Context
- TICKET-059 put `<mark className="bg-teal-soft …">` around the cookies number in
  app/(landing)/_landing/privacy.tsx at the owner's request; on a second look the owner asked
  for it to go (2026-09-06). Nothing else references it; tests/e2e/app/landing.spec.ts does
  not assert on it.

## Plan
- [x] Drop the conditional mark; the number renders like the other three.
- [x] Verify: npm run verify.

## Progress log
- 2026-09-06 — Done in one edit.

## Handoff
Closed.

## Verification
```
npm run verify   # lint, typecheck, ticket check, 157 unit tests: pass
```

## Outcome
Shipped: the mark is gone from privacy.tsx. Nothing left out; no follow-ups.
