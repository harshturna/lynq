# TICKET-013: Identity, salts and the site registry

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** infra

## Goal
Give ingest a trustworthy visitor identity and a site registry with settings, per design §5 and §4.2.

## Context
- Design §4.2 (Postgres DDL for site_hostnames, site_settings, visitor_salts, identified_users,
  pg_ingest_failures, pg_cron jobs), §5.1 (hash construction, byte order, day-keyed salt cache,
  trusted IP), §5.2 (user_hash, site_secret non-rotatable), §5.3 (backfill salt).
- Replaces the client-IP helper from TICKET-003 (`lib/geo/request-geo.ts`): `x-vercel-forwarded-
  for`, then `x-real-ip`; never `x-forwarded-for`.
- `authorizeWebsite` in lib/actions.ts already selects the site id and discards it; it must return
  it for TICKET-016.
- Depends on TICKET-012 only for the vitest setup.

## Plan
- [ ] Supabase migration: the six tables and two pg_cron jobs from §4.2; normalise websites.url to a
      bare hostname and seed site_hostnames; RLS on the new tables (service role only for salts,
      secrets, identified_users).
- [ ] `lib/ingest/hash.ts`: SHA-256, first 8 bytes little-endian to UInt64, with a committed test
      vector; `visitorId()`, `userHash()`, `legacyVisitorId()`.
- [ ] `lib/ingest/salts.ts`: day-keyed cache, insert-on-conflict-then-read.
- [ ] `lib/ingest/client-ip.ts` replacing the request-geo helper's IP function.
- [ ] `authorizeWebsite` returns `{ supabase, siteId }`.
- [ ] Unit tests: hash vector, salt cache across midnight, IP selection. Verify: `npm run verify`.

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
