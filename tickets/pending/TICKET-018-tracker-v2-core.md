# TICKET-018: Tracker v2 core and first-party serving

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** tracker

## Goal
Rewrite the tracker in this repository: session record, batching contract, engagement, SPA and bfcache handling, consent, first-party serving, and the Playwright suite.

## Context
- Design §6.1 (session record and storage rules), §6.2 (engagement schedule), §7.1 (envelope,
  transport contract, 8 KB / 20 event cap, sendBeacon fallback), §8.1 (chunks, budget, serving
  with headers(), attribute surface), §8.2 (behaviour table), §8.3 (tests including the
  invariant test).
- Depends on TICKET-014 for the zod schema the payload types are generated from; can start once
  that schema exists.
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
