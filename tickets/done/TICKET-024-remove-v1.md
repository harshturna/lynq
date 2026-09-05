# TICKET-024: Remove the v1 tracker, route, adapter and old tables

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** infra

## Goal
Retire everything v1 per D-007: the jsDelivr snippet on Lynq's site, /api/lynq, the adapter, the old-table write path, the old tables, the seed rows they produced in analytics.events, the v1 types, and the setup dialog's v1 snippet.

## Context
- D-007. TICKET-023 is done: the dashboard reads analytics.events only.
- Owner, 2026-09-05: no export. "We are also good to delete all the data, we can populate and
  backfill it, it was seed data anyway." So the old tables are dropped outright and the rows the
  backfill (ingest_version 0) and the v1 adapter (ingest_version 1) wrote are deleted; only
  tracker v2 rows (ingest_version 2) stay. Re-seeding demo data is TICKET-026.
- Counts before deletion (production, 2026-09-05): page_views 6,183; sessions 1,672;
  custom_events 4,470; vitals 2,012; visitors 758. analytics.events: v0 14,203; v1 13; v2 25.
  identified_users 0. websites.visitors: aivia 363, lynq 2.
- Code to delete (nothing else imports them, checked with grep): app/api/lynq/route.ts,
  lib/ingest.ts, lib/ingest/v1.ts, lib/ingest/v1-adapter.ts (+ .test.ts), lib/supabase/admin.ts
  (only lib/ingest.ts used it), scripts/backfill-events.ts, scripts/diff-events.ts and their npm
  scripts `backfill` and `diff`, lib/ingest/hash.ts legacyVisitorId (+ its tests),
  lib/geo/request-geo.ts getGeoFromHeaders/RequestGeo (v1 only; v2 uses getGeoCodesFromHeaders),
  lib/types/index.d.ts tracker v1 types (TTrackEvent .. TTrackedEvent, VitalEventData,
  CustomEventData, Browser/Os/Device) and Website.visitors.
- Code to change: app/layout.tsx (drop the jsDelivr script and NEXT_PUBLIC_LYNQ_SCRIPT_VERSION),
  setup-dialog.tsx (v2 snippet: `<script defer src="<origin>/js/lynq.js" data-site="<url>">`),
  proxy.ts matcher and lib/supabase/middleware.ts allow-list (api/lynq, api/event),
  website-card.tsx + dashboard/page.tsx (the visitors counter column goes; show unique
  visitors over the last 30 days from analytics.events through a small lib/query helper),
  README.md line 33 and CLAUDE.md line 4 (point at packages/tracker and /api/collect).
- Dependencies that become unused: `tsx`, `i18n-iso-countries` (backfill only). `isbot` and
  `@vercel/functions` stay (lib/ingest/collect.ts).
- Migration 20260905040000_drop_v1.sql: drop public.page_views, sessions, custom_events, vitals,
  visitors (their policies go with them), drop function public.get_period_summary, drop column
  websites.visitors. Push with `npx supabase db push`, refresh supabase/schema.sql with
  `npx supabase db dump --linked --schema public,analytics`, bump DUMP_INCLUDES_MIGRATIONS_THROUGH
  in tests/setup/database.ts. Row deletion is a one-off SQL, not a migration.
- Order: code first (commit, push, Vercel deploys, /api/lynq becomes 404), then the migration and
  the row deletion, then the dump refresh (second commit under this ticket). Dropping tables
  before the deploy would break the live v1 route for the minute it still exists.
- aivia.byharsh.com still has the v1 script installed; after this ticket it is untracked until
  the owner installs the v2 snippet. NEXT_PUBLIC_LYNQ_SCRIPT_VERSION can be removed from Vercel
  and .env by the owner; the code no longer reads it.
- Landing copy: nothing on the landing page claims cookies or v1 specifics (grep), so no copy
  change is needed; README already says cookie-free.
- Ruled out: an export (owner's call); keeping the backfill script for re-seeding (TICKET-026
  will generate v2 rows directly, git has the old script).

## Plan
- [x] Delete the v1 code, types, scripts and unused dependencies; update layout, setup dialog,
      proxy, middleware, README, CLAUDE.md.
- [x] Replace the websites.visitors counter with a 30-day unique-visitor count from
      analytics.events (lib/query helper + dashboard page + card).
- [x] Write the migration and the schema test expecting the old tables gone; verify, integration,
      e2e, build; commit and push; confirm the deploy answers 404 on /api/lynq and 202 on
      /api/collect.
- [x] Push the migration, delete ingest_version 0 and 1 rows, refresh the dump, bump the test
      constant, rerun integration tests; second commit and push.
- [x] Verify: npm run verify, npm run test:integration, npm run test:e2e, npm run build, live
      checks.

## Progress log
- 2026-09-05 — Created (D-007, Phase 1 opening).
- 2026-09-05 — Started. Plan rewritten after the owner dropped the export and asked for all seed
  data to go; counts recorded above. TICKET-026 (re-seed demo data) filed.
- 2026-09-05 — Code removal done: 8 files deleted, `tsx` and `i18n-iso-countries` uninstalled,
  legacyVisitorId and getGeoFromHeaders gone with their tests, setup dialog shows the v2 snippet
  built from window.location.origin, websites list shows 30-day unique visitors from
  analytics.events (lib/query/site-visitors.ts). Migration 20260905040000_drop_v1.sql written and
  proven by the integration setup (dump + migration replay from a reset container): 21 pass.
  e2e 13 pass, build clean. Committed and pushed; the migration is applied after the deploy.
- 2026-09-05 — Deploy live: /api/lynq now answers 307 to /login (the auth proxy treats it as any
  unknown path; the route itself is gone), /api/collect 400 on an empty body, /js/lynq.js 200.
  `npx supabase db push` applied 20260905040000_drop_v1.sql; deleted 14,216 rows
  (ingest_version 0: 14,203; 1: 13), leaving 25 v2 rows; public schema holds only websites.
  Dump refreshed (384 lines of v1 objects gone), test constant bumped, container reset,
  integration 21 pass. Live guest walk-through: websites list shows 0 and 2 visitors (30 days),
  site page renders, no console errors.

## Handoff
Closed; nothing outstanding.

## Verification
```
npm run verify                                  # lint 0 errors (42 warnings, pre-existing), typecheck, tickets, 80 unit tests pass
TEST_DATABASE_URL=... npm run test:integration  # before the push: dump + migration replay, 21 pass; after: refreshed dump, 21 pass
npm run test:e2e                                # 13 passed (39.7s)
npm run build                                   # clean; /api/lynq no longer in the route list
npx supabase db push --dry-run / db push        # 20260905040000_drop_v1.sql applied
node delete-seed-rows                           # deleted 14216; after: [{ingest_version:2,count:25}]; public tables: websites
curl POST https://lynq.byharsh.com/api/lynq     # 307 -> /login (route gone)
curl POST https://lynq.byharsh.com/api/collect  # 400 on an empty body (endpoint alive)
curl GET  https://lynq.byharsh.com/js/lynq.js   # 200
```
Live guest walk-through with Playwright: /dashboard lists both sites with 30-day visitor
counts (0 and 2), /lynq-byharsh-com renders the analytics tab, zero console errors.

## Outcome
Shipped: v1 is gone end to end. Deleted /api/lynq, lib/ingest.ts, the v1 adapter and its
tests, the backfill and diff scripts, the Supabase admin client, legacyVisitorId,
getGeoFromHeaders and the v1 tracker types; `tsx` and `i18n-iso-countries` uninstalled. The
layout carries only the v2 snippet, the setup dialog shows the v2 snippet, and the proxy and
middleware allow-lists shrink to api/collect and js/. Production: old tables, their policies,
get_period_summary and websites.visitors dropped; all backfill and adapter rows deleted; the
websites list shows 30-day unique visitors from analytics.events instead of the counter.
Left out: no landing copy change was needed (nothing on the page claimed v1 or cookies).
Follow-ups: TICKET-026 (seed demo data). Owner actions: install the v2 snippet on
aivia.byharsh.com (untracked until then); remove NEXT_PUBLIC_LYNQ_SCRIPT_VERSION from Vercel
and .env (no longer read); archive harshturna/lynq-js on GitHub.
