# TICKET-022: Revise the Phase 0 design for Postgres (D-006)

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** infra

## Goal
Bring `docs/design/phase-0-data-foundation.md` from v4 (ClickHouse) to a reviewed v6 on
Supabase Postgres per D-006, and regenerate the implementation tickets to match.

## Context
- D-006 supersedes D-002. The owner's horizon is a few sites; no feature compromise.
- What is store-agnostic and stays: wide event row with page, session and request context on
  every row (§4, §7.1); client session id as the definition (§6); ingest pipeline (§7); tracker
  v2 (§8); backfill (§10); dual-run and diff (§11); authorize seam and primitives (§9).
- What changes: DDL (JSONB, range partitions, indexes), inserts (plain multi-row through the
  transaction pooler), retention (partition drop by pg_cron), roles (Postgres roles, `analytics`
  schema not exposed to PostgREST), funnel/retention/path query shapes (§16), CI container
  (postgres image), cost model, and the scaling ladder (rollups, then ClickHouse).
- Review: one Opus pass on the Postgres-specific parts only; the three earlier reviews cover
  the rest and their findings must not be regressed.
- Tickets TICKET-012..020 were written for ClickHouse; they are regenerated from the revised §17.

## Plan
- [x] Write v5.
- [x] Opus review on partitioning, indexing, JSONB, pooling from Vercel, RLS vs roles, query
      shapes for funnels/paths/retention, the scale ceiling and the ClickHouse exit ramp.
- [x] Fold into v6.
- [x] Regenerate TICKET-012..020; keep TICKET-021.
- [x] Verify: `npm run verify`; the document's Appendix A lists the review.

## Progress log
- 2026-09-05 — Started. D-006 recorded.
- 2026-09-05 — Owner clarified this is a portfolio project: every feature, no scale engineering.
  v5 written at that altitude: one `analytics.events` table with five indexes, no partitions,
  two Postgres roles, pg_cron housekeeping, `postgres.js` for reads, a one-day sanity diff
  instead of the seven-day dual-run. Instance facts checked through the Management API: Postgres
  15.8, max_connections 60, shared_buffers 224 MB, 17 MB used, pg_cron available not installed,
  no pg_partman. Review 4 (Postgres-specific, altitude check) launched on an opus agent.
- 2026-09-05 — Review 4 returned 16 findings. Critical: the insert path used supabase-js against
  a schema PostgREST does not expose, so it could not work. High: new public tables inherit the
  default GRANT ALL to authenticated (moved them into analytics); a plain trigger on websites
  would break addWebsite under RLS (no trigger, lazy defaults); the GIN jsonb_path_ops index did
  not support the operators claimed (dropped); two roles for two timeouts (one role, set local);
  inclusive `between` double-counts boundaries (half-open everywhere); user_hash = 0 becomes the
  largest "user" in retention (compiler adds user_hash <> 0; all-history first-seen); realtime
  on client clock (received_at); casting client text in aggregates (typed vitals and revenue
  columns). Medium: two unused indexes, missing grants and a pgcrypto dependency (env HMAC
  secret instead of site_secret), non-reapplicable cron.schedule calls (one guarded
  housekeeping job), synchronous cascade delete from the UI (soft delete + batched cleanup),
  five query formulations corrected, pooler naming and max:1, updateWebsiteOne allow-list. Cut
  on its advice: payload column, data-debug. All folded into v6 (Appendix A). TICKET-012..020
  regenerated for the Postgres design. Closed.

## Handoff
Closed. See Outcome.

## Verification
```
ls docs/design/phase-0-data-foundation.md   # v6
npm run check:tickets                        # Ticket check passed (22 tickets)
npm run verify                               # pass
```
Review 4 ran on an opus agent against v5; its findings and the responses are in Appendix A of
the document and in this log.

## Outcome
Shipped: design v6 on Supabase Postgres at portfolio altitude; D-006; TICKET-012..020
regenerated with goals, context and plans matching §17 of v6.

Left out: nothing. The ClickHouse tickets were replaced, not edited, so no stale references remain.

Follow-up tickets: TICKET-012..020 (Phase 0 implementation), TICKET-021 (dependency
vulnerabilities, unchanged).
