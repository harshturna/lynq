# TICKET-067: The hero subline ends on the privacy stance

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
The hero subline's last clause is "No cookies, no banner, and no one being followed." with the teal mark on "no one being followed", instead of "and none of your time wasted."

## Context
- Owner, 2026-09-06, did not like the "your time wasted" ending; picked "no one being followed"
  from four options (nothing to configure; no consent to ask for; no dashboard to learn).
  app/(landing)/_landing/hero.tsx; the mark stays `nowrap` so the phrase does not break.

## Plan
- [x] Reword; verify: npm run verify.

## Progress log
- 2026-09-06 — Done.

## Handoff
Closed.

## Verification
```
npm run verify   # pass, 157 unit tests
```

## Outcome
Shipped: the one line. No follow-ups.
