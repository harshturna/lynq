# TICKET-019: Tracker v2 extras and vitals modules

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** tracker

## Goal
The two optional chunks: extras (outbound, downloads, declarative events) and vitals (web-vitals attribution plus navigation timing so the Performance tab keeps its cards).

## Context
- Design §8.1 (chunk loading by attribute), §8.2 (extras rows), §8.4 (vitals module contents, what
  is dropped), §4 (typed vitals columns the values land in).
- Depends on TICKET-018.
- web-vitals/attribution is about 4 KB gzipped on its own.

## Plan
- [x] Extras chunk loaded on data-outbound / data-auto-events.
- [x] Vitals chunk loaded on data-vitals: web-vitals attribution for lcp, cls, inp, fcp, ttfb with
      targets; navigation entry for dcl, load, tti; longtask sum for tbt; resource count.
- [x] Playwright cases for each chunk. Verify: `npm run verify`, `npm run test:e2e`.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).
- 2026-09-05 — Started and implemented. web-vitals 6.2.1 (Apache-2.0). Each metric is sent as
  its own vitals event when web-vitals finalises it, with LCP and INP element selectors from
  the attribution build; navigation timing (dcl, load, tti) and the resource count go out once
  after load; TBT is a longtask sum reported on hide. The vitals chunk is 6.1 KB gzipped, above
  the design's 4.5 KB estimate, because the attribution build is larger than the plain one;
  budget set to 7 KB. Extras: outbound and download clicks classified by host and extension,
  declarative data-lynq-event with data-lynq-prop-* props, all through a capturing listener.
- 2026-09-05 — Deployed; all three chunks served from production byte-identical to the local
  build with the 5-minute cache header. Closed.

## Handoff
Closed. See Outcome.

## Verification
```
node scripts/build-tracker.mjs
public/js/lynq.js 4364 bytes, 2108 gzipped (budget 3072); hashed twin lynq.f7ea50dbfb86.js
public/js/lynq-extras.js 1037 bytes, 623 gzipped (budget 1536)
public/js/lynq-vitals.js 16671 bytes, 6143 gzipped (budget 7168)

npm run verify
Found 46 warnings.
Ticket check passed (22 tickets).
 Test Files  18 passed (18)
      Tests  87 passed (87)

npm run test:e2e
  13 passed (39.5s), including: extras chunk tracks outbound, download and declarative events
  with props and ignores internal links, and tracks nothing when the attributes are absent;
  vitals chunk sends ttfb, dcl, load, resources and fcp/lcp as vitals events on the page's pid

# production
lynq.js: HTTP/2 200 
 cache-control: public, max-age=300, stale-while-revalidate=86400
  = local build
lynq-extras.js: HTTP/2 200 
 cache-control: public, max-age=0, must-revalidate
  = local build
lynq-vitals.js: HTTP/2 200 
 cache-control: public, max-age=0, must-revalidate
  = local build```

## Outcome
Shipped: the extras and vitals chunks, live at /js/lynq-extras.js and /js/lynq-vitals.js,
loaded by the core on `data-outbound`, `data-auto-events` and `data-vitals`.

Left out: nothing from the plan. CLS and INP only report when the page has layout shifts or
interactions, so a quiet page load produces no row for them, which is what NULL means.

Follow-up tickets: none.
