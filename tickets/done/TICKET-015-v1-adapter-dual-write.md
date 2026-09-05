# TICKET-015: v1 adapter dual-write and durable Supabase writes

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
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
- [x] Add `@vercel/functions`; wrap the fire-and-forget writes in `waitUntil()`.
- [x] `lib/ingest/v1-adapter.ts` mapping each v1 event to events rows with `ingest_version = 1`,
      legacy visitor id, hashed session id, per-instance pageview_id and seq tracking.
- [x] Insert after the old-table writes, same client and timeout as v2; failures logged the same way.
- [x] Unit tests for the mapping. Deploy; record the exact deploy timestamp here and in TICKET-017.
      Verify: `npm run verify`, a live v1 beacon producing an ingest_version = 1 row.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).
- 2026-09-05 — Started. Decision: the legacy visitor salt is HMAC(LYNQ_IDENTITY_SECRET,
  "lynq-legacy-salt") rather than a new env var, so the adapter and the backfill derive the
  same value with nothing new to configure. Out-of-window v1 timestamps fall back to the receive
  time and mark the row suspect rather than dropping, because v1 sends one event per request
  and a dropped session-start would orphan the session.
- 2026-09-05 — Deployed. First adapter row in production received at 2026-09-05T15:26:54.220Z; that is the
  backfill cutoff (`--until`) for TICKET-017. A v1 event arriving between the real deploy
  instant and that probe (under a minute on a low-traffic site) would exist in both the old
  tables and the new one; the TICKET-020 diff reports it if it happened. A full v1 session
  through the live route produced pageview, pageview, custom, engagement and vitals rows with
  the session referrer carried onto every row; the old tables received their rows too. Test
  data deleted from both stores. Closed.

## Handoff
Closed. See Outcome.

## Verification
```
npm run verify
Found 45 warnings.
Ticket check passed (22 tickets).
 Test Files  15 passed (15)
      Tests  61 passed (61)

TEST_DATABASE_URL=... npm run test:integration
 Test Files  3 passed (3)
      Tests  9 passed (9)

npm run build
✓ Compiled successfully in 989ms

# production, after deploy
probe session-start until an ingest_version = 1 row appeared: first at 2026-09-05T15:26:54.220Z
v1 session (session-start, page-view, custom-event, session-end) -> 200 200 200 200
analytics.events for that session, ordered by seq:
  1 pageview   /ticket-015  referrer=news.ycombinator.com source=hn channel=Referral
  2 pageview   /docs        referrer=news.ycombinator.com (session referrer kept)
  3 custom     ticket015
  4 engagement engaged_ms=12345
  5 vitals     lcp=1500 resources=30
old tables for that session: page_views 2, sessions 1, vitals 1 (custom_events 0 because the
test event id was not a UUID; the real tracker sends one)
cleanup: 5 events, 1 visitor (cascade), probe rows removed
```

## Outcome
Shipped: every v1 event now also lands in `analytics.events` with `ingest_version = 1`; the v1
route's fire-and-forget writes are kept alive with `waitUntil`; `@vercel/functions` added.
Backfill cutoff recorded: `--until 2026-09-05T15:26:54.220Z`.

Left out: nothing from the plan.

Follow-up tickets: none. TICKET-017's context updated with the cutoff.
