# TICKET-010: Apply the missing period-summary function and add query indexes

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
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
- [ ] New migration `supabase/migrations/<ts>_indexes.sql` with composite btree indexes
      `(website_url, created_at)` on page_views, sessions, vitals, custom_events and
      `(website_url, last_visited)` on visitors. `create index concurrently` cannot run inside
      the migration transaction; table sizes make plain `create index` fine.
- [ ] `npx supabase db push` to apply the period-summary migration and the new one.
- [ ] Verify: rpc probe returns a row instead of "could not find the function"; the guest
      dashboard shows deltas on the stat cards; `npx supabase db dump --linked --schema public`
      shows the five indexes and the function; refresh `supabase/schema.sql` from it.

## Progress log
- 2026-09-05 — Created from TICKET-008 findings.

## Handoff
- **State:** not started.
- **Blocked on:** nothing, but it writes DDL to the production database; owner go-ahead.
- **Next:** write the index migration, push, probe.
- **Read first:** supabase/migrations/, supabase/schema.sql

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
