# TICKET-018: Tracker v2 core and first-party serving

**Status:** in-progress
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** —
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
- [ ] Workspace scaffold, esbuild config producing core and the hashed twin into public/js/;
      `headers()` in next.config.mjs for /js/*.
- [ ] Core per §8.2: session record with try/catch fallbacks and site namespacing, seq,
      pushState/replaceState/popstate/hashchange with de-duplication, pageshow, engagement and
      scroll accumulators, batching and transport contract, GPC/DNT/optOut, localhost, queue
      stub, track/identify.
- [ ] Playwright suite per §8.3 against a local recorder, including the invariant random-walk test and
      the proxy/cache-header assertion.
- [ ] Archive lynq-js with a README pointing here.
- [ ] Verify: `npm run verify`, `npm run test:e2e`, gzipped core size printed by the build under 3 KB.

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

## Handoff
- **State:** packages/tracker (types, pure envelope/split/pageKey, the core in index.ts) builds
  to public/js/lynq.js at 1,965 bytes gzipped plus a hashed twin; contract test parses tracker
  batches with the server schema; Playwright suite (11 tests) green against the fixture server;
  next.config headers() for /js/*; prebuild builds the tracker; CI test job runs e2e.
- **Blocked on:** nothing
- **Next:** verify, commit, push, confirm /js/lynq.js is served with the cache header and no
  cookie, close. Archiving lynq-js on GitHub is the owner's (no gh login here).
- **Read first:** packages/tracker/src/index.ts, tests/e2e/tracker.spec.ts

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
