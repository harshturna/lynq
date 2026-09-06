# TICKET-086: Shared rate limit for keyed endpoints

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** infra

## Goal
A per-key rate limit that holds across server instances, so a runaway middleware snippet or a leaked key cannot flood `/api/bots` (and the keyed endpoints that follow it) by spreading its requests over many Vercel instances.

## Context
- TICKET-075 shipped `/api/bots` with `makeLimiter()` in `lib/ingest/bots.ts`: a fixed window of 120 batches per key per minute, counted in memory per instance. It blunts a single hot instance and nothing more; the design (`docs/design/bot-traffic.md` §7) says "rate limited per key" and this is the honest half of it.
- The same limiter will be wanted by the notes endpoint (TICKET-076) and the MCP read path (TICKET-078), so a shared implementation should arrive with the first of them or with this ticket, whichever is first.
- Options, undecided: a counter row in Postgres (`analytics.api_key_windows`, one update per batch, no new service) or Vercel KV / Upstash (a new service and a secret). D-001 favours no new service until one is needed; the Postgres counter costs one small write per batch, which the batching already keeps rare.
- Keys are D-017; `resolveApiKey` in `lib/api-keys.ts` already writes a coarse `last_used_at` stamp hourly, so a window counter beside it is the same shape.

- Decided in the ticket (2026-09-06): **a Postgres counter, no new service.** One row per key in
  `analytics.api_key_windows` (key_id, window_start, n), one upsert per keyed request that
  resets the count when the minute changes and returns the new count. The write is small and
  keyed requests are already batched; D-001 says no new service until one is needed. A store
  failure lets the request through (fail open), because a database that cannot count is one
  that cannot serve the request either, and a limiter must never be the thing that takes the
  API down.
- One number everywhere: **120 requests per minute per key**, whatever the endpoint. The notes
  route had 60; that difference bought nothing.
- Files read: `lib/ingest/bots.ts` (`makeLimiter`, the `allow` dep), `lib/notes/api.ts` (the
  same dep), `app/api/bots/route.ts`, `app/api/notes/route.ts`, `app/api/notes/[id]/route.ts`,
  `lib/api-keys.ts` (the new `allowKey` lives beside `resolveApiKey`), `lib/db.ts`
  (`withTimeout`), `lib/ingest/bots.test.ts` and `lib/notes/api.test.ts` (the limiter test to
  delete; the `allow` dep becomes sync-or-async), `tests/integration/api-keys.integration.test.ts`
  (pattern for the new test), `tests/integration/schema.integration.test.ts` (table list),
  `docs/design/bot-traffic.md` §7, docs `product/api-keys.mdx`.

## Plan
- [x] Decide Postgres counter versus KV, in the ticket: Postgres counter (above).
- [x] Migration `20260906050000_api_key_windows.sql`; schema test table list.
- [x] `allowKey(keyId, perMinute = 120)` in `lib/api-keys.ts` (async, fail open); `allow` deps in `lib/ingest/bots.ts` and `lib/notes/api.ts` accept `boolean | Promise<boolean>`; `makeLimiter` deleted; the three routes use `allowKey`.
- [x] Integration test: 120 allowed, the 121st refused, from two connections against one key; a new minute resets.
- [x] Design §7 and the API keys docs say the number.
- [x] Verify: npm run verify; npm run test:integration; npm run test:e2e (touches `lib/ingest`); migration pushed to production.

## Progress log
- 2026-09-06 — Filed from TICKET-075, which shipped the in-memory limiter.
- 2026-09-06 — Decided on the Postgres counter; started.
- 2026-09-06 — Built: `analytics.api_key_windows` (one row per key, cascades with it), `allowKey()` beside `resolveApiKey()`, the three keyed routes on it, `makeLimiter` deleted. The `allow` dep on both handlers accepts a promise, so the unit tests keep their sync stubs. Migration pushed to production.

## Handoff
- **State:** shipped and closed.
- **Blocked on:** nothing.
- **Next:** none.
- **Read first:** lib/api-keys.ts

## Verification
```
npm run verify                                   # 0 errors (18 pre-existing warnings), typecheck clean, 87 tickets, 234 unit tests passed
TEST_DATABASE_URL=… npm run test:integration     # 12 files / 59 tests passed (rate-limit test added: cap, refusal, reset, cascade)
TEST_DATABASE_URL=… npm run test:e2e             # 85 passed
npx supabase db push --linked                    # 20260906050000_api_key_windows.sql applied
cd ../lynq-docs && npm run build                 # built
```

## Outcome
Shipped: a shared per-key counter in Postgres (`analytics.api_key_windows`, in production), `allowKey(keyId, perMinute = 120)` in `lib/api-keys.ts` (fail open on a store error), `/api/bots`, `/api/notes` and `/api/notes/:id` on it, one number (120 a minute per key) in the design doc and the API keys docs. Left out: a KV store, not needed. Follow-ups: none; TICKET-078's read path uses the same `allowKey`.
