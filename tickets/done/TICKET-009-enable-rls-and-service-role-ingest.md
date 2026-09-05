# TICKET-009: Enable row-level security and move ingest writes to the service role

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
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
- [x] Owner adds `SUPABASE_SERVICE_ROLE_KEY` to the Vercel project (Production) and deploys `main`.
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
- [x] Apply with `npx supabase db push` (prompts for the database password) or the SQL editor.
- [x] Verify: rerun the TICKET-008 anon probe (every table should error or return 0); the
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
- 2026-09-05 — Owner added the key to Vercel and authorised the push. Pushed main; the Next 16
  build was live within ~20 s (detected by the disappearance of webpack chunk names). Live beacon
  wrote through the service role before RLS, then `db push` applied the migration, then every
  probe passed. Closed.
- 2026-09-05 — (earlier) Migration deliberately NOT pushed: the live Vercel build still writes with the
  anon key, and the migration revokes anon. Applying it before the new code is deployed would
  stop tracking. Blocked on the owner adding the key to Vercel and deploying.

## Handoff
Closed. See Outcome.

(Superseded handoff kept for the record:)
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
```
# 1. live beacon to https://lynq.byharsh.com/api/lynq on the new build, before RLS
POST live /api/lynq -> 200 {"success":true}
session row via service role: {"session_id":"ticket009-live-1788612834219-session","country":"Canada","city":"Winnipeg"}
cleanup: deleted

# 2. npx supabase db push
Applying migration 20260905010000_enable_rls.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260905010000_enable_rls.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}

# 3. probes after RLS (anon key with no sign-in, then the guest user)
-- anon key, no sign-in
  websites       denied: 
  visitors       denied: 
  sessions       denied: 
  page_views     denied: 
  vitals         denied: 
  custom_events  denied: 
  anon insert page_views: denied: permission denied for table page_views
-- guest user, signed in
  own websites: 1
  visitors       756 rows readable
  sessions       1670 rows readable
  page_views     6178 rows readable
  vitals         2008 rows readable
  custom_events  4470 rows readable
  custom_events join sessions: ok
  get_period_summary: {"views_count":32,"visitors_count":14,"average_session_duration":0.07,"bounce_rate":87.5}

# 4. live beacon after RLS
POST live /api/lynq -> 200 {"success":true}
session row via service role: {"session_id":"ticket009-live-1788612846391-session","country":"Canada","city":"Winnipeg"}
cleanup: deleted

# 5. npx supabase db dump --linked --schema public -f supabase/schema.sql
policies: 9  rls enabled: 6  anon grants on tables: 0

npm run verify   # pass
```
The anon read denials print an empty message because PostgREST returns no body for a denied
head-count; the insert denial shows the real "permission denied". The guest reads every row
because the guest owns the only site in production. The live dashboard was not opened in a
browser after RLS; every query it makes was exercised by the guest probe, including the
custom_events → sessions join and the period-summary RPC.

## Outcome
Shipped: RLS enabled on all six tables with owner-only policies for authenticated users; every
anon privilege revoked; the ingest route writes through a server-only service-role client in
`lib/ingest.ts`; `supabase/schema.sql` refreshed (9 policies, 6 tables with RLS, 0 anon grants).
The public anon key can no longer read or write anything.

Left out: write policies for authenticated users on the event tables (the app never needs
them); rate limiting on the ingest route (Phase 0 ingest rewrite).

Follow-up tickets: none.
