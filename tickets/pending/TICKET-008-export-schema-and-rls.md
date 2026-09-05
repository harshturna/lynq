# TICKET-008: Export the database schema and RLS policies into the repo

**Status:** blocked
**Created:** 2026-09-05
**Started:** —
**Completed:** —
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
- [ ] Owner runs `npx supabase login` (browser flow) in a terminal, or exports
      `SUPABASE_ACCESS_TOKEN` from a token created at supabase.com/dashboard/account/tokens.
- [ ] `npx supabase link --project-ref <ref>` (ref from the URL in `.env`).
- [ ] `npx supabase db dump --linked --schema public -f supabase/schema.sql` for tables,
      constraints, indexes, functions, and policies. Review the output for anything that must
      not be committed (there should be none; it is DDL only).
- [ ] Write findings into this ticket: the visitors unique constraint, every RLS policy per
      table, and indexes. Open follow-up tickets for gaps (missing indexes, anon read access,
      missing owner checks in policies).
- [ ] Decide with the owner whether to reset `supabase/migrations` to a baseline from the dump
      or keep the dump as a reference file. Record the choice in DECISIONS.md.
- [ ] Verify: `npm run verify`; the dump file exists and `grep -c "CREATE POLICY"` is non-zero.

## Progress log
- 2026-09-05 — Created. CLI installed. Blocked on `supabase login`.

## Handoff
- **State:** nothing exported yet. CLI ready.
- **Blocked on:** an access token; the owner must run `npx supabase login`.
- **Next:** link the project and run the dump.
- **Read first:** this ticket; `supabase/migrations/20260720000000_period_summary.sql`

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
