# TICKET-018: Tracker v2 core and first-party serving

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** tracker

## Goal
Rewrite the tracker in this repository: session record, batching contract, engagement, SPA and bfcache handling, consent, first-party serving, and the Playwright suite.

## Context
- Design §6.1 (session record and storage rules), §6.2 (engagement schedule), §7.1 (envelope,
  transport contract, caps, sendBeacon fallback), §8.1 (chunks, budget, serving with headers(),
  attribute surface), §8.2 (behaviour table), §8.3 (tests including the invariant test).
- Depends on TICKET-014 for the zod schema the payload types are generated from.
- The current tracker lives in harshturna/lynq-js; it is archived at its last v1 commit at the end
  of this ticket so jsDelivr keeps serving v1.
- npm workspaces: `packages/tracker` is the second workspace; the Next app stays at the root.

## Plan
- [x] Workspace scaffold, esbuild config producing core and the hashed twin into public/js/;
      `headers()` in next.config.mjs for /js/*.
- [x] Core per §8.2: session record with try/catch fallbacks and site namespacing, seq,
      pushState/replaceState/popstate/hashchange with de-duplication, pageshow, engagement and
      scroll accumulators, batching and transport contract, GPC/DNT/optOut, localhost, queue
      stub, track/identify.
- [x] Playwright suite per §8.3 against a local recorder, including the invariant random-walk test and
      the proxy/cache-header assertion.
- [x] Archive lynq-js with a README pointing here.
- [x] Verify: `npm run verify`, `npm run test:e2e`, gzipped core size printed by the build under 3 KB.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).
- 2026-09-05 — Started and implemented. Decisions: the envelope types are hand-written and a
  contract test parses a tracker-built batch with the server's zod schema (simpler than
  zod-to-ts codegen, same guarantee); the endpoint is derived from the script's own origin;
  extras and vitals chunks are TICKET-019. Finding from the suite: Chromium does not clone
  sessionStorage into a target=_blank tab because target=_blank implies noopener since 2021,
  so such tabs start a new session; only rel="opener" tabs continue it. Design §6.1 corrected.
  Two test-side fixes: the split test counted a piggybacked engagement event; the SPA test
  stopped waiting after the engagement batch and before the new page's pageview.
- 2026-09-05 — Deployed. /js/lynq.js served within ~30 s, byte-identical to the local build,
  with the 5-minute cache header and no cookie; the hashed twin answered 404 on its first
  request (deploy propagation) and 200 with the immutable header a minute later. Closed.

## Handoff
Closed. See Outcome.

## Verification
```
node scripts/build-tracker.mjs
public/js/lynq.js 4047 bytes, 1965 gzipped (budget 3072); hashed twin lynq.31eb1e6582df.js

npm run verify   # includes tests/tracker/contract.test.ts
Found 46 warnings.
Ticket check passed (22 tickets).
 Test Files  18 passed (18)
      Tests  87 passed (87)

npm run test:e2e   # Playwright, chromium, fixture server recording every batch
  11 passed (34.1s): page load with context and pre-load queue; SPA navigation new pid, same-URL
  replaceState and hash changes send nothing; hidden tab sends an engagement delta with the pid;
  bfcache restore is a new pageview; rel=opener tab continues the session and a target=_blank tab
  starts a new one; track() batches and flushes on pagehide; oversized queue splits under the caps;
  storage blocked still records; identify attaches uid and GPC suppresses it; optOut/optIn; the
  random-walk invariant (page context on every batch, distinct pids per navigation, increasing seq)

# production
GET /js/lynq.js                 200, cache-control: public, max-age=300, stale-while-revalidate=86400, no set-cookie, 4047 bytes = local build
GET /js/lynq.31eb1e6582df.js    200, cache-control: public, max-age=31536000, immutable
```

## Outcome
Shipped: `packages/tracker` (core only), the build script with the size budget, `prebuild`,
cache headers, the contract test, the Playwright suite and fixture server, CI running e2e.
The script is live at https://lynq.byharsh.com/js/lynq.js.

Left out: the extras and vitals chunks (TICKET-019); archiving `harshturna/lynq-js` on GitHub
(owner action, no GitHub login on this machine; nothing depends on it since jsDelivr keeps
serving the frozen v1 file either way); the dashboard's install snippet still shows the v1
jsDelivr tag until Phase 1 replaces the setup dialog. `zod-to-ts` was not used; the contract
test gives the same guarantee.

Follow-up tickets: none.
