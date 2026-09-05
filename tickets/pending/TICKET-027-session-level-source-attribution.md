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

## Plan
- [ ] Add entry_referrer, entry_source, entry_channel and entry UTM columns to the sessions CTE
      and register them as session dimensions in lib/query/filters.ts.
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
