# TICKET-027: Attribute sources, referrers and channels by session entry

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** quality

## Goal
The Referrers, Sources and Channels breakdowns count each session once, by the referrer it arrived with, instead of counting every pageview after the first as Direct.

## Context
- Found while seeding demo data (TICKET-026). The tracker sends document.referrer on every
  pageview; ingest turns an internal referrer into '' (lib/ingest/url.ts parseReferrer), and
  UTM only exists on the landing URL. So every pageview after a session's first has referrer
  '', source '' and channel Direct. The per-row breakdown in lib/query/primitives.ts then
  shows Direct at ~74% on the seeded site while only ~33% of sessions actually arrived direct.
  Production behaves the same; it was just invisible with ten pageviews.
- Fix belongs in the query layer, not the tracker: a session-constant dimension (entry referrer,
  entry source, entry channel, entry UTM) taken from the session's first pageview via the
  sessions CTE (lib/query/sessions.ts already exposes entry_path the same way), with the
  breakdown metric being sessions or visitors rather than pageviews. Plausible and Fathom count
  sources per visit; that is what people expect.
- Filters on source/channel/referrer should match the session's entry values too, so a chip on
  "Organic Search" keeps the whole session (design §9 filter semantics for session dimensions).
- The dashboard's Referrers and Sources cards (lib/dashboard.ts) switch to the new dimensions;
  the Direct row synthesised in TICKET-023 goes away once Direct is a real entry value.

- Design docs/design/phase-1-ui-overhaul.md §9.1 (v4) settles the shape: one composite `entry`
  column in the sessions CTE from `array_agg(row(referrer, source, channel, utm_*) order by ts,
  seq, pageview_id) filter (where event = 'pageview'))[1]`, opt-in through the CTE's `extra`
  mechanism so summary and timeseries do not pay for it, projected as `(s.entry).channel`;
  `min()` over these columns returns '' and is exactly the bug. `referrer`, `source`, `channel`
  and `utm_*` leave SESSION_CONSTANT in the same change. lib/url-state.ts (TICKET-029) adds the
  entry_* dimensions to its allow-list. This is step 7 of the Phase 1 sequence (§16); TICKET-034
  depends on it.

- Read on start: Postgres cannot address the fields of an anonymous `row(...)` record
  (`(s.entry).channel` fails with "could not identify column"), and a declared composite type
  would need a migration that TICKET-034 owns. So the entry column is a `jsonb_build_object`
  of the eight fields taken from the first pageview the same way, projected as
  `(s.entry ->> 'channel')`. Same cost class (one ordered aggregate per session, only when
  asked for), served by `events_site_ts`. The CTE adds the column when a filter or a
  breakdown uses an entry dimension (`Compiled.needsEntry`, or `sessionCte(..., { entry })`).
- The old dashboard keeps its `referrer` and `source` card keys for the UI and chips; the
  server action maps them to `entry_referrer` / `entry_source` with the `sessions` metric,
  and chips on those cards filter by the session's entry value. The `rows(ctx, "sessions")`
  list also switches its source and channel columns to the entry values; `min()` there was
  the same bug.
- The query fixture's session 22 carried google.com on every row, which is not what ingest
  produces; rows after the first pageview now carry '' / '' / Direct so the test exercises the
  bug.

## Plan
- [x] Add the composite entry column to the sessions CTE (opt-in) and register entry_referrer,
      entry_source, entry_channel, entry_utm_source/medium/campaign/term/content as session
      dimensions in lib/query/filters.ts; remove the per-row columns from SESSION_CONSTANT.
- [x] breakdown() on a session dimension with a session metric; integration test on the query
      fixture (session 22 arrives from Google: three pageviews, one session for Google).
- [x] lib/dashboard.ts uses entry dimensions for Referrers and Sources; remove the synthetic
      Direct row; chips on those dimensions filter by session.
- [x] Verify: npm run verify, npm run test:integration; guest walk-through on the seeded site
      shows Direct near the seed's 33% entry share.

## Progress log
- 2026-09-05 — Created from TICKET-026.
- 2026-09-05 — Started; jsonb entry column instead of an anonymous record (see Context).
- 2026-09-05 — Landed: `ENTRY_FIELDS` and the opt-in entry column in lib/query/sessions.ts; eight
  entry_* session dimensions, `sessionExpr`, `isEntryDimension` and `Compiled.needsEntry` in
  lib/query/filters.ts (referrer, source, channel, utm_* left SESSION_CONSTANT); breakdown and
  the sessions list read the entry column in lib/query/primitives.ts; the dashboard action maps
  its referrer and source cards to entry_referrer / entry_source with the sessions metric and
  the synthetic Direct row is gone. Fixture and tests updated.

## Handoff
- **State:** Closed; next is TICKET-034 (query additions, migration, tracker viewport).
- **Blocked on:** nothing.
- **Next:** TICKET-034.
- **Read first:** lib/query/sessions.ts (entry column) and lib/query/filters.ts (entry_*).

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:integration
```
verify: lint (42 pre-existing warnings), typecheck, ticket check, 143 unit tests passed.
Integration: 5 files / 24 tests passed, including the new cases in
tests/integration/query.integration.test.ts: entry_channel by sessions is Direct 2, Organic
Search 1 (session 22 counted once for Google although only its first pageview carries it);
entry_source by visitors; entry_referrer by pageviews returns all three of session 22's
pageviews; a per-row `channel` breakdown by sessions now throws; an `entry_channel is Organic
Search` filter keeps the whole session (1 session, 3 pageviews) and `entry_source is_not
Google` keeps the other two; the sessions list reports Google / Organic Search for session 22
and '' / Direct for session 23.

Guest walk-through on `next dev -p 3005` against the seeded site (aivia.byharsh.com, last 30
days): Referrers card reads Direct 36% (1,157 sessions), google.com 30%, x.com 9%, github.com
6%, producthunt.com 3%, reddit.com 3%; the seed's entry share of direct traffic is about a
third, where the old per-pageview count showed 74%. No new console errors (the pre-existing
useActionState warning on the guest login remains).

## Outcome
Shipped: session-entry attribution in the query layer (entry_referrer, entry_source,
entry_channel, entry_utm_source/medium/campaign/term/content as session dimensions, usable as
breakdown dimensions with any metric and as session filters), the sessions list's source and
channel from the entry, and the old dashboard's Referrers and Sources cards counting sessions
by entry with chips that filter by session. Deviation from design §9.1: a jsonb object rather
than an anonymous record, for the reason in Context; the design's cost and behaviour are
unchanged. Left out: nothing. No follow-up tickets.
