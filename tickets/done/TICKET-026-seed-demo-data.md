# TICKET-026: Seed demo data for the guest sites

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** infra

## Goal
The guest dashboard shows a believable year of traffic again: a script generates tracker-v2-shaped rows in analytics.events for aivia.byharsh.com (and optionally lynq.byharsh.com) so every feature has data to demonstrate.

## Context
- TICKET-024 deleted the old seed data (backfill and adapter rows) per the owner's call; only
  live v2 rows remain (25 rows on lynq.byharsh.com, none on aivia.byharsh.com, site 31). The
  old backfill script read the old tables and is gone; git has it.
- Owner, 2026-09-05: "write a script or something to be able to create seed data ... it'll be
  easy for future if we decide to wipe data and re seed." So: a re-runnable generator, not a
  one-off dump.
- Library: `@faker-js/faker` 10.x (dev dependency) for seeded randomness
  (`faker.seed`), weighted picks (`faker.helpers.weightedArrayElement`), IPs, UUIDs, city names
  and user ids. Distributions themselves are hand-written tables in the script; faker alone
  produces uniform noise, not a believable site. Runner: `tsx` comes back as a dev dependency
  (removed in TICKET-024 with the old scripts) for `npm run seed`.
- Marker for generated rows: `ingest_version = 9`. The column already encodes provenance
  (0 backfill, 1 adapter, 2 tracker v2); the query layer ignores it, so demo rows behave like
  real ones and `delete ... where site_id = $1 and ingest_version = 9` wipes exactly the seed.
  Design doc schema comment updated to list 9.
- Row shape: `EventRow` / `EVENT_COLUMNS` from lib/ingest/rows.ts, inserted straight into
  analytics.events with postgres.js in 1,000-row batches (the pooler's parameter cap is 65,535;
  53 columns x 1,000 fits). Reused helpers: `classify` (source/channel from referrer + UTM),
  `visitorId` with a synthetic per-day salt (sha256 of a fixed seed string and the UTC day, so
  visitor ids rotate daily like production), `userHash` with LYNQ_IDENTITY_SECRET for
  identified users, `idFromText` for session and pageview ids.
- Model of the site (aivia.byharsh.com is an AI product): paths /, /pricing, /docs/*, /blog/*,
  /changelog, /login, /signup, /dashboard; referrers Google, direct, X, GitHub, Product Hunt,
  Reddit, Hacker News, LinkedIn, a newsletter UTM and two paid campaigns; ~18 countries with
  regions and cities weighted toward CA/US/IN/GB/DE; devices 60/34/6, browsers and OS with
  versions, screen sizes tied to device, languages tied to country. Daily volume = baseline x
  growth over the year x weekday factor x noise, with launch spikes on two dates; hourly curve
  by country offset. Sessions: 1-6 pageviews, engaged_ms per pageview, scroll depth; ~20% of
  sessions bounce by the design definition. Custom events: signup_start, signup (with plan
  prop), checkout_start, purchase (revenue 19-199 in props and the revenue column),
  video_play, outbound_click, download. Vitals on ~65% of pageviews with device-dependent
  distributions and lcp/inp targets. Identify events for signed-up users; ~8% of visitors are
  returning identified users with a stable user_hash across days.
- Scale: defaults --days 365 and --visitors 60 (baseline per day at the start of the year,
  growing ~3x) give roughly 35k sessions and 200k rows. --dry-run prints the counts only.
- Flags: --site <url> (default aivia.byharsh.com), --days, --visitors, --seed (RNG seed,
  default 1), --wipe-only, --dry-run. Every run wipes the site's ingest_version 9 rows first.
- Follow-up found: with real volume the Referrers card shows Direct at ~74% because every
  pageview after a session's first carries an empty referrer; the seed mimics ingest exactly.
  Session-level source attribution is TICKET-027.
- Ruled out: pushing synthetic envelopes through /api/collect (time bounds reject old
  timestamps and it would pollute ingest_log); a SQL-only generator (hashing and referrer
  classification live in TypeScript and must match).

## Plan
- [x] Add `@faker-js/faker` and `tsx` as dev dependencies; `npm run seed` script.
- [x] scripts/seed-events.ts: argument parsing, site lookup, wipe, generator, batched insert,
      summary output; unit test for the pure generator (row counts, seq ordering, bounce share,
      every row passes the events check constraint values).
- [x] Run --dry-run, then for real on aivia.byharsh.com; check the dashboard on 24h, 7d, 30d,
      12mo with the Playwright walk-through; note query timing.
- [x] Design doc: ingest_version 9 documented. Verify: npm run verify, npm run test:integration
      (a test inserts generated rows and runs summary/breakdown on them).

## Progress log
- 2026-09-05 — Created from TICKET-024.
- 2026-09-05 — Started; plan above. Decision (routine): ingest_version 9 marks generated rows.
- 2026-09-05 — scripts/seed/generate.ts (pure, seeded) and scripts/seed-events.ts (CLI) written.
  Unit test: determinism, range, session shape (seq order, one visitor, entry referrer only on
  the first pageview), accepted values. Integration test inserts a week of generated rows and
  checks that lib/query's summary reproduces the generator's own pageview, session, custom
  event and bounce counts, that every breakdown has rows, vitals samples match, and a purchase
  with revenue comes back. Dry run for 365 days at 40 visitors/day: 181,342 rows, 26,955
  sessions, 18.6% bounce, 2.41 pageviews per session, $9,853 revenue, generated in 0.9 s.
- 2026-09-05 — First production seed (181,342 rows) walked live: 30d 3,111 visitors / 7,439
  views / 19.0% bounce; 12mo 25,910 / 62,426; refetch 1.2 s (24h), 1.4 s (7d), 3.4 s (12mo);
  200 events listed; no console errors. Two fixes: the current day had no rows (the loop
  stopped at yesterday), and trailing engagement rows could land past the range end; both
  fixed with tests, re-seeded. Filed TICKET-027 (Direct inflated by per-pageview attribution).

## Handoff
Closed; nothing outstanding.

## Verification
```
npm run verify                                   # lint 0 errors (42 warnings, pre-existing), typecheck, tickets, 84 unit tests pass (4 new)
TEST_DATABASE_URL=... npm run test:integration   # 5 files, 23 tests pass (seed test: generator counts == lib/query summary)
npm run seed -- --days 365 --visitors 40 --dry-run
  generated in 881 ms: rows 181342, sessions 26955, pageviews 64979, vitals 42262, custom 6891, identify 2231, revenue 9853
npm run seed -- --days 365 --visitors 40        # wiped 181342 seeded rows; inserted 181812/181812
  analytics.events now holds 181812 seeded rows for the site, 2025-09-05T00:26:43Z to 2026-09-05T17:54:06Z
timeseries last_30d for site 31: 30 daily points, today (2026-09-05) = 167 pageviews
```
Live guest walk-through (Playwright, production) on aivia.byharsh.com: 30d shows 3,111
visitors, 7,439 views, 1.88 min, 19.0% bounce, 18 countries with flags, pages, referrers,
devices; 12mo shows 25,910 visitors and a growth curve with two launch bumps; Events lists 200
rows; Performance shows p75 vitals. Refetch: 24h 1.2 s, 7d 1.4 s, 12mo 3.4 s. No console errors.

## Outcome
Shipped: `npm run seed` (scripts/seed-events.ts + scripts/seed/generate.ts) generating a
deterministic, wipeable year of tracker-v2-shaped demo traffic per site, marked
ingest_version 9; `@faker-js/faker` and `tsx` as dev dependencies; unit and integration
tests; design doc notes the marker. aivia.byharsh.com is seeded with 181,812 rows.
Left out: seeding lynq.byharsh.com (it has real traffic; the owner can run
`npm run seed -- --site lynq.byharsh.com` if wanted). Follow-up: TICKET-027 (per-pageview
source attribution inflates Direct; move Referrers, Sources and Channels to session entry).
The 12-month refetch at 3.4 s is the load-time item already recorded in TICKET-025.
