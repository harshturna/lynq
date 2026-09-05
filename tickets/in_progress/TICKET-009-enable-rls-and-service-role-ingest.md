# TICKET-009: Enable row-level security and move ingest writes to the service role

**Status:** in-progress
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** —
**Area:** infra

## Goal
Close the hole TICKET-008 found: the public anon key can read, write, and delete every row of
every table. After this ticket, the anon role can do nothing, authenticated users can only see
their own sites' data, and the ingest route writes with a server-only service-role key.

## Context
- `supabase/schema.sql` shows no `ENABLE ROW LEVEL SECURITY`, no policies, and `GRANT ALL` to
  `anon` and `authenticated` on all six tables and their sequences. Probe in TICKET-008 confirmed
  anon reads of every table.
- Why the service role rather than anon insert policies: the ingest route
  (`app/api/lynq/route.ts` → `addVisitor`, `addSession`, `addPageView`, `addSessionDuration`,
  `addVitals`, `addCustomEvent` in `lib/actions.ts`) also *reads* `websites` and *updates*
  `websites.visitors` and `sessions.session_duration`. Anon policies wide enough for that would
  still expose every tracked domain and allow overwriting session durations. A server-only key
  that bypasses RLS keeps the anon role at zero grants. The route already validates origin and
  bots; it becomes the single trusted writer.
- The dashboard reads (`getAnalytics`, `getVitals`, `getCustomEventData`, `getPeriodComparison`,
  `getAllWebsites`, `getWebsite`) run as the authenticated user through `lib/supabase/server.ts`
  and keep working under owner policies. `get_period_summary` is SECURITY INVOKER, so RLS applies
  inside it once TICKET-010 creates it.
- `lib/supabase/server.ts` builds the cookie-based client. A new `lib/supabase/admin.ts` builds a
  service-role client with `persistSession: false`; it must only be imported from server code
  (route handlers and `"use server"` files), never from anything that ships to the browser.
- Needs from the owner before starting: the project's service-role key added to `.env` as
  `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Project Settings → API) and to the Vercel project's
  environment. It must not carry the `NEXT_PUBLIC_` prefix.
- Risk: a wrong policy silently breaks the dashboard or ingest. Apply in a migration, then run
  the verification probes before considering it done. RLS can be disabled again with one
  statement if something is missed.
- Ruled out: keeping anon inserts with per-table insert-only policies (see above). Ruled out:
  deferring to the ClickHouse rewrite; the hole is live today.

## Plan
- [x] Service-role key in `.env` (fetched through the Management API under the owner's CLI login).
- [ ] Owner adds `SUPABASE_SERVICE_ROLE_KEY` to the Vercel project (Production) and deploys `main`.
- [x] Add `lib/supabase/admin.ts` (service-role client). Switch the six ingest write functions
      in `lib/actions.ts` to it. Move them out of the `"use server"` file into
      `lib/ingest.ts` so they are not exposed as callable server actions at all.
- [x] Migration `supabase/migrations/20260905010000_enable_rls.sql` written (not applied):
      - `alter table ... enable row level security` on all six tables.
      - `websites`: authenticated select/insert/update/delete where `user_id = auth.uid()`.
      - `visitors`, `sessions`, `page_views`, `vitals`, `custom_events`: authenticated select
        where `website_url in (select url from websites where user_id = auth.uid())`. No
        insert/update/delete policies for authenticated (the app never writes these as a user).
      - `revoke all on all tables in schema public from anon; revoke all on all sequences in
        schema public from anon;` and matching `alter default privileges`.
- [ ] Apply with `npx supabase db push` (prompts for the database password) or the SQL editor.
- [ ] Verify: rerun the TICKET-008 anon probe (every table should error or return 0); the
      TICKET-002 guest probe (own site readable); `npm run build`; a real beacon to a local
      `next start` with `NEXT_PUBLIC_ENV=dev` pointing at the dev data domain, then confirm the
      session row landed and delete it with the admin client.

## Progress log
- 2026-09-05 — Created from TICKET-008 findings. Waiting on the service-role key.
- 2026-09-05 — Key obtained via `GET /v1/projects/{ref}/api-keys` with the CLI login token and
  written to the ignored `.env`. Added `lib/supabase/admin.ts` (imports `server-only`). Moved the
  seven ingest functions out of the `"use server"` file into `lib/ingest.ts` on the admin client;
  the route is their only importer. Wrote the RLS migration. Verified the write path end to end
  against a local `next start`: session-start beacon → 200, session, page view and visitor rows
  present, test rows deleted through the cascade. `npm run verify` and `npm run build` green.
- 2026-09-05 — Migration deliberately NOT pushed: the live Vercel build still writes with the
  anon key, and the migration revokes anon. Applying it before the new code is deployed would
  stop tracking. Blocked on the owner adding the key to Vercel and deploying.

## Handoff
- **State:** all code done and verified locally; RLS migration written but not applied.
- **Blocked on:** `SUPABASE_SERVICE_ROLE_KEY` set in the Vercel project and `main` deployed
  with commit "TICKET-009: ..." live. No Vercel CLI on this machine, so the owner does both.
- **Next:** once the deploy is live, (1) `npx supabase db push` applies
  20260905010000_enable_rls.sql, (2) rerun the TICKET-008 anon probe expecting errors or zero
  rows on every table, (3) rerun the TICKET-002 guest probe expecting the guest's own site
  readable, (4) send a beacon to the live endpoint and confirm the row with the admin client,
  (5) refresh `supabase/schema.sql`, close, commit. If ingest breaks after the push, the rollback
  is `alter table ... disable row level security` on the six tables plus re-granting anon.
- **Read first:** this ticket, lib/ingest.ts, supabase/migrations/20260905010000_enable_rls.sql

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
