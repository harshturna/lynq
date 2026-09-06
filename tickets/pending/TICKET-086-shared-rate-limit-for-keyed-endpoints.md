# TICKET-086: Shared rate limit for keyed endpoints

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
**Area:** infra

## Goal
A per-key rate limit that holds across server instances, so a runaway middleware snippet or a leaked key cannot flood `/api/bots` (and the keyed endpoints that follow it) by spreading its requests over many Vercel instances.

## Context
- TICKET-075 shipped `/api/bots` with `makeLimiter()` in `lib/ingest/bots.ts`: a fixed window of 120 batches per key per minute, counted in memory per instance. It blunts a single hot instance and nothing more; the design (`docs/design/bot-traffic.md` §7) says "rate limited per key" and this is the honest half of it.
- The same limiter will be wanted by the notes endpoint (TICKET-076) and the MCP read path (TICKET-078), so a shared implementation should arrive with the first of them or with this ticket, whichever is first.
- Options, undecided: a counter row in Postgres (`analytics.api_key_windows`, one update per batch, no new service) or Vercel KV / Upstash (a new service and a secret). D-001 favours no new service until one is needed; the Postgres counter costs one small write per batch, which the batching already keeps rare.
- Keys are D-017; `resolveApiKey` in `lib/api-keys.ts` already writes a coarse `last_used_at` stamp hourly, so a window counter beside it is the same shape.

## Plan
- [ ] Decide Postgres counter versus KV, in the ticket (a D-NNN only if KV, because it is a new service).
- [ ] Implement `allow(keyId)` against the shared store with the same 120/min default, wire it into `app/api/bots/route.ts` in place of `makeLimiter()`.
- [ ] Integration test: 121 batches in a minute from two "instances" against one key; the 121st is a 429 regardless of instance.
- [ ] Verify: npm run verify; npm run test:integration.

## Progress log
- 2026-09-06 — Filed from TICKET-075, which shipped the in-memory limiter.

## Handoff
Not started.

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
