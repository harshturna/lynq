# TICKET-014: Ingest v2 endpoint

**Status:** in-progress
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** —
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
- [ ] zod schema for the envelope (§7.1) and `zod-to-ts` output for the tracker package.
- [ ] `lib/ingest/`: site resolution with 60 s hit/miss cache and default settings; time bounds;
      excluded IPs and paths via `glob.ts`; enrichment (ua-parser-js, platform geo);
      url/referrer/utm parsing with caps and control-char stripping; referrers.ts; revenue
      parser; row builder.
- [ ] `app/api/collect/route.ts`: gates before parsing, pipeline order exactly as §7.2, CORS headers
      and OPTIONS, `maxDuration = 5`, multi-row insert through lib/db.ts with `set local
      statement_timeout = 2000`, ingest_log rows.
- [ ] proxy.ts matcher exclusions and the CI assertion (§7.10). Owner optionally enables the Vercel
      Firewall rule.
- [ ] Unit tests for every stage; integration test posting fixture batches and reading rows back.
      Verify: `npm run verify`, `npm run test:integration`.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).
- 2026-09-05 — Started after the owner added the two env vars to Vercel. Implemented the whole
  pipeline as a pure function of its inputs (handleCollect) with the database dependencies in
  db-deps.ts, so the unit tests need no server and the integration test needs no route.
  Decisions: ua-parser-js 1.x (MIT) rather than 2.x (AGPL); a hand-written referrer list instead
  of copying another project's data file; net.BlockList for excluded IPs; no debug response.
  Test setup: a `server-only` stub aliased in vitest so server modules can be imported.

## Handoff
- **State:** lib/ingest/{schema,url,referrers,glob,time-bounds,enrich,site-resolution,sites,
  excluded-ips,rows,collect,db-deps,fixtures}.ts written with unit tests (56 passing);
  app/api/collect/route.ts wires them; proxy.ts matcher excludes api/collect, api/lynq, js/;
  request-geo.ts gained getGeoCodesFromHeaders; tests/integration/collect.integration.test.ts
  drives the real pipeline against the container. ua-parser-js pinned to 1.x (2.x is AGPL).
- **Blocked on:** nothing
- **Next:** verify, integration on a fresh container, build, push (deploys), live beacon to
  /api/collect from a registered Origin, confirm the rows and clean them up, close.
- **Read first:** lib/ingest/collect.ts, app/api/collect/route.ts

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
