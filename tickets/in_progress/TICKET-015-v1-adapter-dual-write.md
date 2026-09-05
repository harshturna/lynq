# TICKET-015: v1 adapter dual-write and durable Supabase writes

**Status:** in-progress
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** —
**Area:** infra

## Goal
Make the existing v1 route also write events rows so existing installs feed the new table, make its old-table writes durable, and record the go-live time as the backfill cutoff.

## Context
- Design §7.9 (mapping rules, pageview_id and seq tracking, session-first referrer classification,
  waitUntil), §11 step 1.
- Depends on TICKET-014 for the row builder and classification code.
- `app/api/lynq/route.ts` calls addPageView and addCustomEvent without await; `@vercel/functions`
  is not yet a dependency.
- The deploy time of this ticket becomes `--until` for TICKET-017.

## Plan
- [ ] Add `@vercel/functions`; wrap the fire-and-forget writes in `waitUntil()`.
- [ ] `lib/ingest/v1-adapter.ts` mapping each v1 event to events rows with `ingest_version = 1`,
      legacy visitor id, hashed session id, per-instance pageview_id and seq tracking.
- [ ] Insert after the old-table writes, same client and timeout as v2; failures logged the same way.
- [ ] Unit tests for the mapping. Deploy; record the exact deploy timestamp here and in TICKET-017.
      Verify: `npm run verify`, a live v1 beacon producing an ingest_version = 1 row.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).
- 2026-09-05 — Started. Decision: the legacy visitor salt is HMAC(LYNQ_IDENTITY_SECRET,
  "lynq-legacy-salt") rather than a new env var, so the adapter and the backfill derive the
  same value with nothing new to configure. Out-of-window v1 timestamps fall back to the receive
  time and mark the row suspect rather than dropping, because v1 sends one event per request
  and a dropped session-start would orphan the session.

## Handoff
- **State:** lib/ingest/v1-adapter.ts (pure mapping with per-instance session memory, legacy
  visitor salt derived from LYNQ_IDENTITY_SECRET) with unit tests; lib/ingest/v1.ts wires site
  resolution, enrichment and the insert; app/api/lynq/route.ts wraps the fire-and-forget writes
  in waitUntil and awaits the adapter after the old-table writes.
- **Blocked on:** nothing
- **Next:** verify, integration, build, push, wait for the deploy, send a live v1 beacon, confirm
  ingest_version = 1 rows, record the deploy timestamp as --until here and in TICKET-017, close.
- **Read first:** lib/ingest/v1-adapter.ts, app/api/lynq/route.ts

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
