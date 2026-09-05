# TICKET-014: Ingest v2 endpoint

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** infra

## Goal
The /api/collect endpoint: the only writer of v2 rows, with the full pipeline, gates and diagnostics from design §7.

## Context
- Design §7.1 (envelope and transport contract), §7.2 (13-step pipeline and the reject/suspect
  matrix), §7.3 (site resolution with lazy default settings, glob-to-LIKE translator), §7.4–§7.7
  (referrer, classification, identify, custom events and revenue parsing), §7.10 (proxy
  matcher).
- Depends on TICKET-012 and TICKET-013.
- `proxy.ts` and `lib/supabase/middleware.ts` redirect every unauthenticated non-allow-listed path
  to /login and call Supabase Auth per request; the matcher must exclude api/collect, api/lynq
  and js/.
- Referrer map seeded from Plausible's public list (MIT); keep attribution in the file header. No
  debug response from the endpoint (review 4).

## Plan
- [x] zod schema for the envelope (§7.1) and `zod-to-ts` output for the tracker package.
- [x] `lib/ingest/`: site resolution with 60 s hit/miss cache and default settings; time bounds;
      excluded IPs and paths via `glob.ts`; enrichment (ua-parser-js, platform geo);
      url/referrer/utm parsing with caps and control-char stripping; referrers.ts; revenue
      parser; row builder.
- [x] `app/api/collect/route.ts`: gates before parsing, pipeline order exactly as §7.2, CORS headers
      and OPTIONS, `maxDuration = 5`, multi-row insert through lib/db.ts with `set local
      statement_timeout = 2000`, ingest_log rows.
- [x] proxy.ts matcher exclusions and the CI assertion (§7.10). Owner optionally enables the Vercel
      Firewall rule.
- [x] Unit tests for every stage; integration test posting fixture batches and reading rows back.
      Verify: `npm run verify`, `npm run test:integration`.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).
- 2026-09-05 — Started after the owner added the two env vars to Vercel. Implemented the whole
  pipeline as a pure function of its inputs (handleCollect) with the database dependencies in
  db-deps.ts, so the unit tests need no server and the integration test needs no route.
  Decisions: ua-parser-js 1.x (MIT) rather than 2.x (AGPL); a hand-written referrer list instead
  of copying another project's data file; net.BlockList for excluded IPs; no debug response.
  Test setup: a `server-only` stub aliased in vitest so server modules can be imported.
- 2026-09-05 — Deployed. Live on Vercel within ~40 s. A real beacon from a registered Origin
  produced three rows with geo (CA/MB/Winnipeg from the platform headers), device and browser
  from the UA, source and channel from the session URL's UTM, props and the typed revenue
  column. Unregistered Origin and missing Origin logged as designed; curl's default UA is caught
  by the bot gate (202, nothing written). One OPTIONS request during rollout hit a stale node
  and returned the old 307; five requests afterwards were all 204 with the CORS headers. The
  Vercel Firewall rate-limit rule was not configured (optional per design §7.7). Closed.

## Handoff
Closed. See Outcome.

## Verification
```
npm run verify
Found 44 warnings.
Ticket check passed (22 tickets).
 Test Files  14 passed (14)
      Tests  56 passed (56)

TEST_DATABASE_URL=... npm run test:integration   # fresh Supabase Postgres container
 Test Files  3 passed (3)
      Tests  9 passed (9)

npm run build
✓ Compiled successfully in 2.2s
├ ƒ /api/collect

# production, after deploy
OPTIONS /api/collect (Origin aivia.byharsh.com) -> 204, access-control-allow-origin echoed, vary: Origin (5/5 nodes)
POST /api/collect real batch, Chrome UA          -> 202 in 0.46 s; 3 rows in analytics.events:
  pageview  path=/ticket-014-live source=hn channel=Referral country=CA region=MB city=Winnipeg device=desktop browser=Chrome 128 os=Mac OS
  custom    name=ticket014 props={plan:pro,revenue:100} revenue=100
  engagement engaged_ms=1234
POST unregistered Origin                          -> 202, ingest_log stage=unregistered
POST no Origin                                    -> 400, ingest_log stage=origin_missing
POST with curl's default UA                       -> 202, bot gate
GET /api/collect                                  -> 405
test rows deleted afterwards
```

## Outcome
Shipped: `/api/collect` in production with the full design §7 pipeline; `lib/ingest/*` as
testable modules; `getGeoCodesFromHeaders`; the proxy no longer touches the ingest or script
paths; 56 unit tests and 9 integration tests.

Left out: the Vercel Firewall rate-limit rule (optional, owner's dashboard); `zod-to-ts`
generation of the tracker's payload types, which belongs to TICKET-018 where the tracker
package exists.

Follow-up tickets: none.
