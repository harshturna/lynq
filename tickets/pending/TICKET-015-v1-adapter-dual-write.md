# TICKET-015: v1 adapter dual-write and durable Supabase writes

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** infra

## Goal
Make the existing v1 route also write v2 rows so existing installs feed ClickHouse, and make its Supabase writes durable; record the go-live time as the backfill cutoff.

## Context
- Design §7.11 (mapping rules, pageview_id tracking, seq, session-first referrer classification,
  waitUntil), §11 step 1.
- Depends on TICKET-014 for the row builder and classification code.
- `app/api/lynq/route.ts` calls addPageView and addCustomEvent without await (fire-and-forget);
  `@vercel/functions` is not yet a dependency.
- The deploy time of this ticket becomes `--until` for TICKET-017.

## Plan
- [ ] Add `@vercel/functions`; wrap the fire-and-forget Supabase writes in `waitUntil()`.
- [ ] `lib/ingest/v1-adapter.ts` mapping each v1 event to v2 rows with `ingest_version = 1`, legacy
      visitor id, hashed session id, per-instance pageview_id and seq tracking.
- [ ] Insert after the Supabase writes, same client and timeout as v2; failures recorded the same way.
- [ ] Unit tests for the mapping. Deploy; record the exact deploy timestamp in this ticket and in
      TICKET-017. Verify: `npm run verify`, a live v1 beacon producing an ingest_version = 1
      row.

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
