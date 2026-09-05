# TICKET-008: Export the database schema and RLS policies into the repo

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** infra

## Goal
Make the security posture reviewable. The repo holds one migration (the period-summary RPC);
the tables, indexes, unique constraints, and every RLS policy exist only in the hosted database.

## Context
- Tables known from the code: `websites`, `visitors`, `sessions`, `page_views`, `vitals`,
  `custom_events`. The ingest route writes to all but `websites` with the anon key and no
  session, so RLS must allow anonymous inserts there; the exact policies are unknown.
- Open questions the dump answers: the unique constraint on `visitors` (TICKET-005 depends on
  whether it is `client_id` alone or `(client_id, website_url)`), whether authenticated users
  can read other users' rows in the event tables (TICKET-002 added an app-side check; RLS is
  the second layer), and what indexes exist on `website_url, created_at`.
- Tooling: `supabase` CLI 2.116 is installed as a dev dependency (`npx supabase`). Homebrew
  install failed on outdated Xcode command line tools. No `psql` or `pg_dump` locally.
- Blocked on an access token. `npx supabase projects list` returns
  LegacyPlatformAuthRequiredError. The project ref is derivable from
  NEXT_PUBLIC_SUPABASE_URL in `.env`.
- `supabase/.temp/` (link state) is now git-ignored.

## Plan
- [x] Owner runs `npx supabase login` (browser flow) in a terminal, or exports
      `SUPABASE_ACCESS_TOKEN` from a token created at supabase.com/dashboard/account/tokens.
- [x] `npx supabase link --project-ref <ref>` (ref from the URL in `.env`).
- [x] `npx supabase db dump --linked --schema public -f supabase/schema.sql` for tables,
      constraints, indexes, functions, and policies. Review the output for anything that must
      not be committed (there should be none; it is DDL only).
- [x] Write findings into this ticket: the visitors unique constraint, every RLS policy per
      table, and indexes. Open follow-up tickets for gaps (missing indexes, anon read access,
      missing owner checks in policies).
- [x] Decide with the owner whether to reset `supabase/migrations` to a baseline from the dump
      or keep the dump as a reference file. Record the choice in DECISIONS.md.
- [x] Verify: `npm run verify`; the dump file exists and `grep -c "CREATE POLICY"` is non-zero.

## Progress log
- 2026-09-05 — Created. CLI installed. Blocked on `supabase login`.
- 2026-09-05 — Owner logged in. Linked project ybdtwzzqayykeacprzcn (matches `.env`). Dump
  needs Docker; started OrbStack. Dumped public schema to `supabase/schema.sql` (11 KB).
- 2026-09-05 — Decision on baseline vs reference: keep `supabase/schema.sql` as a reference
  snapshot, not a migration. The roadmap (D-002) replaces this schema; a baseline migration
  would be thrown away. Recorded here, not in DECISIONS.md, because it is cheap to reverse.

## Handoff
Closed. See Outcome.

## Verification
```
npx supabase link --project-ref ybdtwzzqayykeacprzcn      # ok
npx supabase db dump --linked --schema public -f supabase/schema.sql
  Dumped schema to supabase/schema.sql   # 6 CREATE TABLE, 0 CREATE POLICY, 0 ENABLE ROW LEVEL SECURITY, 0 CREATE INDEX
node anon-probe.mjs   # supabase-js with the public anon key, no sign-in
  websites       anon can read 1 rows
  visitors       anon can read 756 rows
  sessions       anon can read 1670 rows
  page_views     anon can read 6178 rows
  vitals         anon can read 2008 rows
  custom_events  anon can read 4470 rows
  get_period_summary: MISSING -> Could not find the function public.get_period_summary
npm run verify   # pass
```

## Outcome
Shipped: `supabase/schema.sql`, a reference dump of the production public schema.

Findings:
1. **No row-level security on any table, and `GRANT ALL` to `anon` and `authenticated` on
   every table and sequence.** The anon key is public (it is in the browser bundle), so anyone
   can read, insert, update, and delete every row of every table. Confirmed by the probe above.
   TICKET-002's app-side ownership check is currently the only thing between users; it does not
   help against direct PostgREST calls. Critical. → TICKET-009.
2. **`get_period_summary` does not exist in production.** The migration in
   `supabase/migrations/` was never applied, so the stat-card deltas have never rendered.
   → TICKET-010.
3. **No indexes beyond primary keys and unique constraints.** Every dashboard query filters
   `website_url` + `created_at` on page_views, sessions, vitals, custom_events and does a
   sequential scan. → TICKET-010.
4. **`visitors.client_id` is unique on its own** (constraint `session_clients_client_id_key`),
   and `sessions.client_id` has a foreign key to it. A browser that visits two Lynq-tracked
   sites only ever gets a visitors row on the first, so the second site undercounts visitors.
   Changing the constraint means dropping the FK; the roadmap replaces the schema (D-002), so
   this is documented, not fixed. TICKET-005's scoped update stays correct.
5. Only one website exists in production, owned by the guest user. The earlier "zero foreign
   rows visible" result in TICKET-002 was because there were none, not because of RLS.
6. All foreign keys cascade on delete from `websites.url`, so deleting a site deletes its data.
   `sessions.client_id` cascades from `visitors`, so deleting a visitor deletes their sessions.

Follow-up tickets: TICKET-009 (RLS and service-role ingest), TICKET-010 (apply the missing
migration and add indexes).
