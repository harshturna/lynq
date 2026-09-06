# TICKET-064: The landing page stops calling the numbers a demo

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
The landing page shows its real numbers without labelling them a demo: the band under the hero reads "Last 30 days", the hero's second action is "See Lynq in action →", and the live count says "N people on a live site right now".

## Context
- Owner, 2026-09-06: remove "The demo site, last 30 days" and avoid the word demo on the
  landing page. Visible uses were app/(landing)/_landing/band.tsx (the band label), hero.tsx
  (the "See the live demo →" link to /login) and live-count.tsx ("on the demo site right now",
  "Quiet on the demo site right now"). The data still comes from the guest's site through
  lib/screens/landing.ts and /api/demo/live; only the words changed. tests/e2e/app/landing.spec.ts
  asserted the old link name.

## Plan
- [x] Reword the three components and the spec.
- [x] Verify: npm run verify; TEST_DATABASE_URL=… npx playwright test --project=app tests/e2e/app/landing.spec.ts.

## Progress log
- 2026-09-06 — Done.

## Handoff
Closed.

## Verification
```
npm run verify                                                          # pass, 157 unit tests
TEST_DATABASE_URL=... npx playwright test --project=app landing.spec.ts  # 8 passed (22.3 s), landing spec plus the 4 setup steps
```

## Outcome
Shipped: the three rewordings and the spec. Left out: the login page's "Explore app as guest" button and the docs' "live demo" wording, which are not the landing page. No follow-ups.
