# TICKET-068: Nothing in the product or the docs teases what is coming

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
No screen or docs page announces a feature that does not exist: the settings Team block and its nav entry are gone, the docs settings page has no Team section, and the proxying page says what is not supported without promising what will be.

## Context
- Owner, 2026-09-06: "remove the Team point or anything that's coming soon". Found:
  app/(main)/[website_slug]/settings/_settings/settings.tsx (SECTIONS entry, the muted nav
  style for it, `<Team />` and the `Team` block "Coming in Phase 2 / Not available yet");
  lynq-docs src/pages/product/settings.mdx ("## Team — Coming later"); src/pages/tracking/
  self-hosting.mdx ("Not yet", "## What is planned"). tests/e2e/app/settings.spec.ts does not
  reference Team. Design §8.11 lists Team as Phase 2 work; that stays a plan in the design doc,
  not a promise in the product.

## Plan
- [x] Remove the block, nav entry and conditional (the `cn()` around the nav class had only that conditional left, so it went too).
- [x] Docs: drop the Team section; reword the proxying page to "not supported" plus what to do, no plan.
- [x] Verify: npm run verify; TEST_DATABASE_URL=… npx playwright test --project=app settings.spec.ts; docs build.

## Progress log
- 2026-09-06 — Done.

## Handoff
Closed.

## Verification
```
npm run verify                                                              # pass, 157 unit tests
TEST_DATABASE_URL=... npx playwright test --project=app tests/e2e/app/settings.spec.ts   # 5 passed (17.9 s)
cd ../lynq-docs && npm run build                                            # compiled, 25 pages
```

## Outcome
Shipped: the settings screen without Team; lynq-docs commit df0e640. Nothing left out; no follow-ups.
