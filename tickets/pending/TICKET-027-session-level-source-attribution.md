# TICKET-027: Attribute sources, referrers and channels by session entry

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
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

## Plan
- [ ] Add the composite entry column to the sessions CTE (opt-in) and register entry_referrer,
      entry_source, entry_channel, entry_utm_source/medium/campaign/term/content as session
      dimensions in lib/query/filters.ts; remove the per-row columns from SESSION_CONSTANT.
- [ ] breakdown() on a session dimension with a session metric; integration test on the query
      fixture (session 22 arrives from Google: three pageviews, one session for Google).
- [ ] lib/dashboard.ts uses entry dimensions for Referrers and Sources; remove the synthetic
      Direct row; chips on those dimensions filter by session.
- [ ] Verify: npm run verify, npm run test:integration; guest walk-through on the seeded site
      shows Direct near the seed's 33% entry share.

## Progress log
- 2026-09-05 — Created from TICKET-026.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** what is built and working right now, what is half-done
- **Blocked on:** nothing | what
- **Next:** the next one to three concrete actions
- **Read first:** files to open before touching anything

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
