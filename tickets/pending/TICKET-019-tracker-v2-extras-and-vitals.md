# TICKET-019: Tracker v2 extras and vitals modules

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** tracker

## Goal
The two optional chunks: extras (outbound, downloads, declarative events) and vitals (web-vitals attribution plus navigation timing so the Performance tab keeps its cards).

## Context
- Design §8.1 (chunk loading by attribute), §8.2 (extras rows), §8.4 (vitals module contents, what
  is dropped).
- Depends on TICKET-018.
- web-vitals/attribution is about 4 KB gzipped on its own; the navigation timing and longtask
  additions must stay small.

## Plan
- [ ] Extras chunk loaded on data-outbound / data-auto-events.
- [ ] Vitals chunk loaded on data-vitals: web-vitals attribution for lcp, cls, inp, fcp, ttfb with
      targets; navigation entry for dcl, load, tti; longtask sum for tbt; resource count.
- [ ] Playwright cases for each chunk. Verify: `npm run verify`, `npm run test:e2e`.

## Progress log
- 2026-09-05 — Created from the Phase 0 design (TICKET-011, D-004, D-005).

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** what is built and working right now, what is half-done
- **Blocked on:** nothing | what
- **Next:** the next one to three concrete actions
- **Read first:** files to open before touching anything

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
