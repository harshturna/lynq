# TICKET-057: Landing page on the light base

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
The landing page looks like the product: light, Geist, teal, with the product staged inside
panels the way the mock does, real numbers from the demo site in the hero band, and copy in
the plain tone the owner approved.

## Context
- Approved mock: https://claude.ai/code/artifact/adcf774a-24ba-4806-8f4d-b87f20a1a217, reached
  after four rounds (D-014 records the direction and what was rejected).
- The old landing (app/(landing)/components/*, dark, Poppins, gradient text) is replaced
  outright; its components and the hero and feature images are unreachable afterwards and
  are deleted. The auth pages keep their look (out of scope, as in Phase 1).
- Data: lib/screens/landing.ts finds the demo site as the guest user's first website
  (GUEST_USER_ID) and reads, with the query layer directly on a built context, the last 30
  days of visitors per day, the total, the top five pages, and visitors now. The page
  revalidates every 60 s. A public route app/api/demo/live/route.ts returns visitors now for
  the demo site with a 10 s cache, excluded from proxy.ts like api/live; the hero polls it.
  When there is no demo site (the e2e fixture, a fresh deploy) the band and the live line
  are simply not rendered.
- The staged panels show fixed demo numbers as in the mock; they are presentational React,
  not screenshots and not the app's data components.
- Motion: sections fade up on entry, the band's line draws once, the visitor salt in the
  ledger re-scrambles, the live dot pulses; all off under reduced motion.
- e2e: tests/e2e/app/landing.spec.ts loads /, checks the heading, axe at 1280 and 375, and
  the demo live route's JSON.

## Plan
- [x] lib/screens/landing.ts and app/api/demo/live/route.ts; proxy matcher.
- [x] app/(landing)/page.tsx and _landing/* components; delete the old components and images;
  metadata.
- [x] Look at 1280 and 375 against the mock; e2e spec; verify; test:e2e.

## Progress log
- 2026-09-06 — Created and started from the approved mock.
- 2026-09-06 — Landed. Looked at 1280 and 375 against the mock. Found and fixed: the hero glow
  widened the page (the root clips horizontal overflow); the staged panels' absolutely placed
  UI needed a stacked layout under 768 px (relative, full width, the change column hidden);
  the page lacked a main landmark; the closing line and the struck-through "never stored"
  values were in --faint and failed contrast; a zero live count reads "Quiet on the demo site
  right now". DEMO_SITE_SLUG overrides the guest lookup, used locally to point the page at the
  e2e fixture site.

## Handoff
- **State:** Closed.
- **Blocked on:** nothing
- **Next:** the pending tickets: 049, 051, 048
- **Read first:** the mock; app/(landing)/page.tsx

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:e2e
```
verify: 33 files / 149 unit tests. e2e: 60 passed in 2.5 min, including the new landing spec:
the heading and the demo link at 1280 and 375, no sideways scroll, axe clean after every
section has been revealed, and the demo live route's JSON. Screenshots of the real page at
both widths reviewed against the mock, with DEMO_SITE_SLUG pointing at the fixture site so
the band and the live line rendered with real numbers.

## Outcome
Shipped: the landing page per D-014 with real demo-site numbers in the hero band and the live
line, the public demo live route, and the old landing components and images removed. Left
out: the auth pages' look (still the old dark style, as agreed in Phase 1); a /privacy page
(the footer links to it; it does not exist yet, filed as TICKET-058).
