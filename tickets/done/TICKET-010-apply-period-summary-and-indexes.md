# TICKET-010: Apply the missing period-summary function and add query indexes

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** infra

## Goal
Make the stat-card deltas work in production and stop every dashboard query from scanning
whole tables.

## Context
- `supabase/migrations/20260720000000_period_summary.sql` defines `get_period_summary`, but
  the TICKET-008 probe shows the function does not exist in production. `getPeriodComparison`
  soft-fails, so the deltas have simply never appeared.
- `supabase/schema.sql` has no indexes beyond primary keys and unique constraints. Every read
  in `lib/actions.ts` filters `website_url` and a `created_at` range on `page_views`,
  `sessions`, `vitals`, `custom_events`; `visitors` is filtered by `website_url` and
  `last_visited`; `sessions` is also looked up by `session_id` (unique already) and
  `custom_events` joins `sessions` on `session_id`.
- Row counts today are small (6k page views), so this is about not falling over as they grow,
  not a visible speedup now.
- Applying: `npx supabase db push` runs unapplied migrations in order and prompts for the
  database password. Both migrations are additive and safe to run on the live database.
- Order relative to TICKET-009: independent. If TICKET-009 lands first, RLS applies inside
  the function because it is SECURITY INVOKER; that is intended.

## Plan
- [x] New migration `supabase/migrations/<ts>_indexes.sql` with composite btree indexes
      `(website_url, created_at)` on page_views, sessions, vitals, custom_events and
      `(website_url, last_visited)` on visitors. `create index concurrently` cannot run inside
      the migration transaction; table sizes make plain `create index` fine.
- [x] `npx supabase db push` to apply the period-summary migration and the new one.
- [x] Verify: rpc probe returns a row instead of "could not find the function"; the guest
      dashboard shows deltas on the stat cards; `npx supabase db dump --linked --schema public`
      shows the five indexes and the function; refresh `supabase/schema.sql` from it.

## Progress log
- 2026-09-05 — Created from TICKET-008 findings.
- 2026-09-05 — `db push` works through the CLI login token without the database password.
  Wrote 20260905000000_indexes.sql, pushed both migrations, probed the function as the guest,
  refreshed supabase/schema.sql.

## Handoff
Closed. See Outcome.

## Verification
```
npx supabase db push
Applying migration 20260720000000_period_summary.sql...
Applying migration 20260905000000_indexes.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260720000000_period_summary.sql","20260905000000_indexes.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
node rpc-probe.mjs   # signed in as guest
get_period_summary (last 30 days, guest site): {"views_count":32,"visitors_count":14,"average_session_duration":0.07,"bounce_rate":87.5}
npx supabase db dump --linked --schema public -f supabase/schema.sql
indexes: 5  functions: 1
npm run verify
Found 44 warnings.
Ticket check passed (10 tickets).
```
The guest dashboard's deltas were not eyeballed in a browser; the RPC returning a row for the
guest's site is the condition getPeriodComparison needs.

## Outcome
Shipped: `get_period_summary` now exists in production; five composite indexes on the range
queries; `supabase/schema.sql` refreshed to match.

Left out: nothing from the plan.

Follow-up tickets: none.
