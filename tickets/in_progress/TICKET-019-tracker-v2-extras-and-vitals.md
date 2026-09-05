# TICKET-019: Tracker v2 extras and vitals modules

**Status:** in-progress
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** —
**Area:** tracker

## Goal
The two optional chunks: extras (outbound, downloads, declarative events) and vitals (web-vitals attribution plus navigation timing so the Performance tab keeps its cards).

## Context
- Design §8.1 (chunk loading by attribute), §8.2 (extras rows), §8.4 (vitals module contents, what
  is dropped), §4 (typed vitals columns the values land in).
- Depends on TICKET-018.
- web-vitals/attribution is about 4 KB gzipped on its own.

## Plan
- [ ] Extras chunk loaded on data-outbound / data-auto-events.
- [ ] Vitals chunk loaded on data-vitals: web-vitals attribution for lcp, cls, inp, fcp, ttfb with
      targets; navigation entry for dcl, load, tti; longtask sum for tbt; resource count.
- [ ] Playwright cases for each chunk. Verify: `npm run verify`, `npm run test:e2e`.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).
- 2026-09-05 — Started and implemented. web-vitals 6.2.1 (Apache-2.0). Each metric is sent as
  its own vitals event when web-vitals finalises it, with LCP and INP element selectors from
  the attribution build; navigation timing (dcl, load, tti) and the resource count go out once
  after load; TBT is a longtask sum reported on hide. The vitals chunk is 6.1 KB gzipped, above
  the design's 4.5 KB estimate, because the attribution build is larger than the plain one;
  budget set to 7 KB. Extras: outbound and download clicks classified by host and extension,
  declarative data-lynq-event with data-lynq-prop-* props, all through a capturing listener.

## Handoff
- **State:** packages/tracker/src/{extras,vitals}.ts built to public/js/lynq-extras.js (623 B
  gzipped) and lynq-vitals.js (6.1 KB gzipped, web-vitals 6.2.1 attribution build); the core
  loads them from its own origin when the script tag carries data-outbound / data-auto-events /
  data-vitals and exposes the `_v` hook; two new Playwright tests.
- **Blocked on:** nothing
- **Next:** verify, commit, push, confirm both chunk URLs are served, close.
- **Read first:** packages/tracker/src/vitals.ts, packages/tracker/src/extras.ts

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
