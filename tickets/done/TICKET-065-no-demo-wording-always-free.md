# TICKET-065: No "demo" wording anywhere; "Always free" replaces "Free during beta"

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
Following TICKET-064 on the landing page, the login page and the docs stop saying "demo" too, and every "Free during beta" becomes "Always free".

## Context
- Owner, 2026-09-06. User-facing "demo": app/(auth)/login/page.tsx ("Opening the demo…"),
  lynq-docs src/pages/index.mdx ("Try it first … the live demo"). "Free during beta":
  app/(landing)/_landing/hero.tsx (the checks), closing.tsx (the close), app/(auth)/sign-up/page.tsx
  (the lede). Internal comments and identifiers (DemoStats, /api/demo/live, DemoBand) are not
  user-facing and stay. The "Explore app as guest" button keeps its name; the e2e sign-in
  clicks it by that name.

## Plan
- [x] Reword the three "beta" lines, the login pending text, and the docs section ("See it in action").
- [x] Verify: npm run verify; `npm run build` in lynq-docs; docs pushed.

## Progress log
- 2026-09-06 — Done.

## Handoff
Closed.

## Verification
```
npm run verify                     # pass, 157 unit tests
cd ../lynq-docs && npm run build   # compiled, 25 pages prerendered
```

## Outcome
Shipped: app commit and lynq-docs commit 8f94f10. Nothing left out; no follow-ups.
