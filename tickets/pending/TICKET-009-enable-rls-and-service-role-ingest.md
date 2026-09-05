# TICKET-009: Enable row-level security and move ingest writes to the service role

**Status:** pending
**Created:** 2026-09-05
**Started:** —
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
- [ ] Owner adds `SUPABASE_SERVICE_ROLE_KEY` to `.env` and Vercel.
- [ ] Add `lib/supabase/admin.ts` (service-role client). Switch the six ingest write functions
      in `lib/actions.ts` to it. Move them out of the `"use server"` file into
      `lib/ingest.ts` so they are not exposed as callable server actions at all.
- [ ] Migration `supabase/migrations/<ts>_enable_rls.sql`:
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

## Handoff
- **State:** not started.
- **Blocked on:** service-role key in `.env` and Vercel.
- **Next:** admin client, move ingest writes, write the migration.
- **Read first:** supabase/schema.sql, lib/actions.ts, app/api/lynq/route.ts

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
