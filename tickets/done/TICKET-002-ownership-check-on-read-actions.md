# TICKET-002: Ownership check on analytics read actions

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Area:** quality
**Completed:** 2026-09-05

## Goal
Stop any logged-in user from reading another user's site data by calling a server action with a
website URL they do not own. Critical finding from the 2026-09-05 review.

## Context
- Server actions in `lib/actions.ts` are callable from any client with a session. Today
  `getAnalytics`, `getVitals`, `getCustomEventData`, and `getPeriodComparison` verify that the
  passed `user_id` equals the session user, then query by `website_url` with no check that the
  user owns that URL. `getAllWebsites(userId)` has no session check at all.
- Ownership is expressed in the `websites` table: `url` + `user_id`. `getWebsite(slug, user_id)`
  already filters on both, so the page is safe; the actions are not.
- Callers, unchanged by this ticket: `app/(main)/[website_slug]/page.tsx` lines 46 to 49,
  `app/(main)/[website_slug]/_components/website-dashboard.tsx` lines 65 to 68,
  `app/(main)/dashboard/page.tsx` line 17. Signatures stay the same.
- RLS policies are not in the repo (see the review), so this ticket adds the check in application
  code. Committing the schema and RLS is a separate ticket.
- The `get_period_summary` RPC in `supabase/migrations/20260720000000_period_summary.sql` runs
  as SECURITY INVOKER; the app-side check is what gates it.
- Ruled out: changing the actions to take a slug instead of a URL. It would touch three callers
  and the client component for no security gain over an ownership lookup.

## Plan
- [x] Add a private `authorizeWebsite(website_url, user_id)` helper in `lib/actions.ts` that
      creates the client, loads the session user, checks `user_id === user.id`, and confirms a
      `websites` row exists with that `url` and `user_id`. Returns `{ supabase, error }`.
- [x] Use it in `getAnalytics`, `getVitals`, `getCustomEventData`, `getPeriodComparison`,
      replacing their duplicated auth boilerplate. Unauthorized returns the same error shape each
      action already returns.
- [x] Add the session check to `getAllWebsites`.
- [x] Verify: `npm run verify`, `npm run build`, and a node script that signs in as the guest
      user with the anon key and runs the ownership query for the guest's own site (expect a
      row) and for a URL it does not own (expect none).

## Progress log
- 2026-09-05 — Planned and started. Files read: lib/actions.ts, the three callers, the
  period-summary migration.
- 2026-09-05 — Added `authorizeWebsite` in lib/actions.ts and wired it into getAnalytics,
  getVitals, getCustomEventData, getPeriodComparison. getAllWebsites now checks the session user.
  Return types unchanged except getAllWebsites' error, which may now be a string; its only caller
  treats error as truthy.

## Handoff
Closed. See Outcome.

## Verification
```
npm run verify   # lint 0 errors / 44 warnings, tsc clean, ticket check pass
npm run build    # compiled, 8 pages, exit 0
node ownership-test.mjs   # signs in as the guest user with the anon key, runs the exact
                          # ownership query used by authorizeWebsite
  guest owns 1 site(s)
  own site         -> ALLOWED
  not-owned url    -> DENIED
  other users' websites rows visible to guest: 0
```
The last line also shows RLS on `websites` restricts rows to the owner, so the helper's lookup
cannot be satisfied by another user's row. Not tested end to end through a server action call,
which needs a browser session; the helper is the only new code path and it was exercised directly.

## Outcome
Shipped: every read action that takes a website URL now confirms the session user owns that URL
before querying. One extra indexed lookup per action. Callers untouched.

Left out: RLS policies on page_views, sessions, vitals, custom_events, visitors, which would make
this defence-in-depth. That is the "commit the schema" quick fix and gets its own ticket.

Follow-up tickets: none created here; schema and RLS export is already on the quick-fix list.
