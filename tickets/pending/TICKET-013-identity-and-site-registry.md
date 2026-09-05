# TICKET-013: Identity and site registry

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** infra

## Goal
Give ingest a trustworthy visitor identity and a site registry with settings, and close the app-side gaps review 4 found.

## Context
- Design §5 (hash construction and byte order, salt cache, trusted IP, HMAC user hash with
  LYNQ_IDENTITY_SECRET, legacy scheme), §7.3 (hostname normalisation and seeding,
  updateWebsiteOne allow-list), §14 (soft delete).
- Replaces the client-IP helper from TICKET-003 (`lib/geo/request-geo.ts`): `x-vercel-forwarded-
  for`, then `x-real-ip`; never `x-forwarded-for`.
- `authorizeWebsite` in lib/actions.ts selects the site id and discards it; it must return it.
  `updateWebsiteOne` accepts any column name today; it is narrowed to name and is_first_visit.
  `deleteWebsite` becomes a soft delete (sets deleted_at); housekeeping does the rest.
- Depends on TICKET-012.

## Plan
- [ ] `lib/ingest/hash.ts`: SHA-256 first 8 bytes little-endian to signed 64-bit, committed test
      vector; `visitorId()`, `userHash()` (HMAC), `legacyVisitorId()`.
- [ ] `lib/ingest/salts.ts`: Node-generated salt, insert-on-conflict-then-read, day-keyed cache.
- [ ] `lib/ingest/client-ip.ts` replacing the request-geo helper's IP function.
- [ ] Migration: normalise websites.url to a bare hostname and seed analytics.site_hostnames.
- [ ] lib/actions.ts: authorizeWebsite returns siteId; updateWebsiteOne allow-list; deleteWebsite
      soft-deletes.
- [ ] Unit tests: hash vector, salt cache across midnight, IP selection, hostname normalisation.
      Verify: `npm run verify`.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).

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
