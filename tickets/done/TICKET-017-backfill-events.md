# TICKET-017: Backfill the old tables into analytics.events

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** infra

## Goal
Move all historical data into the events table with the mappings and approximations stated in design §10.

## Context
- Design §10 (mapping table, approximations, --until, idempotent wipe, dry-run, batching), §5.3
  (legacy visitor id).
- Depends on TICKET-015, deployed 2026-09-05. `--until 2026-09-05T15:26:54.220Z` (first adapter row in
  production).
- Legacy country names must map to ISO codes with i18n-iso-countries; print unmapped names. Heap
  sizes and interaction count are not carried.
- Runs from a laptop with the pooler URL; never from CI.

## Plan
- [x] `scripts/backfill-events.mjs --site --until --dry-run` per §10.
- [x] Dry run against production; review the unmapped-country and orphan reports.
- [x] Real run; record counts per table on both sides here.
- [x] Verify: counts match the old tables within the stated approximations; `npm run verify`.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).
- 2026-09-05 — Started. Profiled the old tables first: countries are a mix of names, aliases
  (UK, USA) and bare codes; devices include Tablet (v1 stored it after all); custom events are
  4,470 property rows in 4,426 groups; no orphan page views. Wrote the script to reuse the
  ingest modules (hash, url, referrers, rows) via tsx. First real run failed with
  MAX_PARAMETERS_EXCEEDED: 5,000 rows x 53 columns exceeds Postgres's 65,535 parameters per
  statement; batches are now 1,000 rows. Second run succeeded.
- 2026-09-05 — Cross-check: pageviews 6,178 = 6,178; custom 4,426 = 4,426 groups; vitals
  2,008 = 2,008; engagement 1,591 = sessions with a duration. Sessions read 5,431 in the new
  table against 1,670 old rows because the old data has 256 sessions whose page views span
  several UTC days (max 10 distinct days, one spanning 573 days; this is seeded data) and 777
  session rows with no page views: the daily visitor rotation (D-003) makes each day a new
  (visitor, session) pair. Expected, and the kind of difference the design says to report,
  not gate. Closed.

## Handoff
Closed. See Outcome.

## Verification
```
npm run backfill -- --site aivia.byharsh.com --until 2026-09-05T15:26:54.220Z --dry-run   # then without --dry-run
site aivia.byharsh.com (#31), until 2026-09-05T15:26:54.220Z
old rows: sessions 1670, page_views 6178, vitals 2008, custom_events 4470
built rows: pageview 6178, engagement 1591, vitals 2008, custom 4426 (custom groups 4426) = 14203
orphans: page_views without a session 0, custom events without a session 0
unmapped countries: none
pageview countries: [["CA",2045],["US",1888],["IN",670],["JP",229],["DE",199],["BR",195],["GB",194],["AU",188],["FR",159],["MX",104],["NL",91],["CN",61]]
wiped 0 previous backfill rows
analytics.events now holds 14203 backfilled rows for the site, 6178 pageviews (old page_views: 6178)

# cross-check
backfilled: {"pageviews":6178,"sessions":5431,"customs":4426,"vitals":2008,"engagement":1591,"first":"2024-01-01","last":"2026-09-05"}
old tables: {"page_views":6178,"sessions":1670,"custom_groups":4426,"vitals":2008,"sessions_with_duration":1591}
top sources: [{"source":"","channel":"Direct","n":4487},{"source":"Google","channel":"Organic Search","n":458},{"source":"X","channel":"Social","n":360},{"source":"Bing","channel":"Organic Search","n":336},{"source":"Facebook","channel":"Social","n":258},{"source":"harshturna.com","channel":"Referral","n":109}]
visitor-days vs old distinct client_id: 4712 vs 516
by ingest_version: [{"ingest_version":0,"n":14203}]
old sessions by distinct UTC days of their page views: {"sessions":893,"multi_day":256,"max_days":10,"median_days":1}
page-view time span per old session: {"median_span_days":0.00324522054398148,"max_span_days":"573.8569836787268519"}

npm run verify
Found 46 warnings.
Ticket check passed (22 tickets).
 Test Files  17 passed (17)
      Tests  83 passed (83)
```

## Outcome
Shipped: `scripts/backfill-events.ts` (`npm run backfill`), `tsx` and `i18n-iso-countries` as
dependencies; production `analytics.events` holds 14,203 `ingest_version = 0` rows for
aivia.byharsh.com covering 2024-01-01 to the cutoff.

Left out: nothing from the plan. Approximations as designed: legacy device as stored, no
regions, no browser versions, engagement attached one second after the last pageview.

Follow-up tickets: none.
