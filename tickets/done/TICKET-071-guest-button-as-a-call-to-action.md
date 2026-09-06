# TICKET-071: The guest button is a second call to action

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
The login page's guest entry reads "See Lynq in action →", the same phrase the landing page uses to send people there, and looks like a choice beside Log in rather than a footnote.

## Context
- Owner, 2026-09-06: "Explore app as guest" should be more professional and closer to a CTA.
  app/(auth)/login/page.tsx; the button's classes come from app/(auth)/_auth/form.tsx, where
  the grey QUIET style becomes SECONDARY: teal outline, teal text, medium weight, teal-soft on
  hover. tests/e2e/app/setup.ts clicks the button by name for the guest sign-in; the docs home
  names it. The pending text is "Opening the live site…".

## Plan
- [x] Rename and restyle; update the setup step and the docs sentence.
- [x] Verify: npm run verify; TEST_DATABASE_URL=… npx playwright test --project=app auth.spec.ts; docs build.

## Progress log
- 2026-09-06 — Done.

## Handoff
Closed.

## Verification
```
npm run verify                                                           # pass, 157 unit tests
TEST_DATABASE_URL=... npx playwright test --project=app tests/e2e/app/auth.spec.ts   # 12 passed (20 s), the guest sign-in included
cd ../lynq-docs && npm run build                                         # compiled, 25 pages
```

## Outcome
Shipped: the button, the setup step, lynq-docs commit dc5fe80. No follow-ups.
