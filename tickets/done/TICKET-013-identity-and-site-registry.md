# TICKET-013: Identity and site registry

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
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
- [x] `lib/ingest/hash.ts`: SHA-256 first 8 bytes little-endian to signed 64-bit, committed test
      vector; `visitorId()`, `userHash()` (HMAC), `legacyVisitorId()`.
- [x] `lib/ingest/salts.ts`: Node-generated salt, insert-on-conflict-then-read, day-keyed cache.
- [x] `lib/ingest/client-ip.ts` replacing the request-geo helper's IP function.
- [x] Migration: normalise websites.url to a bare hostname and seed analytics.site_hostnames.
- [x] lib/actions.ts: authorizeWebsite returns siteId; updateWebsiteOne allow-list; deleteWebsite
      soft-deletes.
- [x] Unit tests: hash vector, salt cache across midnight, IP selection, hostname normalisation.
      Verify: `npm run verify`.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).
- 2026-09-05 — Started. Implemented everything in the plan. Test-run findings: the SQL
  normaliser needed the same character-set check as the TypeScript one; integration files raced
  on public.websites when run in parallel (now fileParallelism: false); Biome flags BigInt
  literals as lossy numbers and the TS target was ES2017, so the tests use BigInt() and the
  target is ES2022. The salt cache moved to salt-cache.ts because the server-only marker on the
  database loader throws under vitest.
- 2026-09-05 — Pushed the seed migration, verified aivia.byharsh.com registered, dump refreshed,
  setup constant bumped, integration re-run from empty, build clean. Closed.

## Handoff
Closed. See Outcome.

## Verification
```
npm run verify
Found 44 warnings.
Ticket check passed (22 tickets).
 Test Files  5 passed (5)
      Tests  22 passed (22)

npx supabase db push
Applying migration 20260905030000_site_hostnames_seed.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260905030000_site_hostnames_seed.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}

node prod-check.mjs   # through LYNQ_DB_POOLER_URL
site_hostnames: [{"site_id":"31","hostname":"aivia.byharsh.com","url":"aivia.byharsh.com"}]
seed re-run inserted: 0

npx supabase db dump --linked --schema public,analytics -f supabase/schema.sql

TEST_DATABASE_URL=... npm run test:integration   # fresh container, dump + newer migrations
 Test Files  2 passed (2)
      Tests  6 passed (6)

npm run build
✓ Compiled successfully in 1141ms
```

## Outcome
Shipped: `lib/ingest/hash.ts` (visitor, user, legacy and text-id hashes with committed vectors),
`salt-cache.ts` and `salts.ts`, `client-ip.ts` (platform headers only), `hostnames.ts` with its
SQL twin `analytics.normalise_hostname()` and `analytics.seed_hostnames()`; production
`site_hostnames` seeded; `authorizeWebsite` returns the site id and ignores soft-deleted sites;
`updateWebsiteOne` accepts only `name` and `is_first_visit`; `deleteWebsite` soft-deletes and
housekeeping finishes the job; the site list and site page hide deleted sites; the v1 route uses
the new IP helper.

Left out: nothing from the plan. Known consequence: a soft-deleted site keeps its URL until the
nightly job removes the row, so re-adding the same URL fails until then.

Follow-up tickets: none.
