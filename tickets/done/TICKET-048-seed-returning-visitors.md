# TICKET-048: Seed generates returning visitors and multi-session visitors

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** quality

## Goal
The seeded site shows sessions above unique visitors, as a real site does, so the Overview's two tiles are not the same number.

## Context
- Found on the TICKET-035 walk-through: aivia.byharsh.com shows Unique visitors 3,081 and
  Sessions 3,081 for the last 30 days, and the old dashboard showed the same equality. The
  query layer is right (visitors is count distinct visitor_id, sessions counts the sessions
  CTE); the generator in scripts/seed/generate.ts gives every visitor one session, so the two
  metrics coincide.
- Fix belongs in the generator: a share of visitors return on later days (same visitor_id,
  new session_id), and a smaller share open two sessions in a day, with the stats block
  counting sessions and visitors separately so tests/integration/seed.integration.test.ts
  can assert sessions > visitors. Re-seed aivia afterwards.
- Read on start (2026-09-06): the generator already has an identified pool (8% of visitor
  slots, returning across days) but stamps their rows with the daily anonymous hash, not the
  user hash as the ingest does (lib/ingest/collect.ts: visitor id is the user hash when a uid
  is sent), so nobody keeps an id across days. And "returning on a later day" cannot apply to
  anonymous visitors at all: their id rotates daily (D-003), so an anonymous return is a new
  visitor by definition. Sessions exceed visitors through two real mechanisms only: a second
  session the same day (same daily id, new session id) and identified users across days.
- Since TICKET-049 the site has a daily rollup built from its rows; a re-seed must rebuild it
  (scripts/seed-events.ts does so at the end).
- Files: scripts/seed/generate.ts (session loop, stats), scripts/seed/generate.test.ts,
  tests/integration/seed.integration.test.ts, scripts/seed-events.ts.

## Plan
- [x] generate(): identified rows carry the user hash as visitor_id; a share of visitors (12% anonymous, 30% identified) open a second session the same day, 2 to 8 hours later.
- [x] Stats gain `visitors` (distinct ids); unit test asserts visitors < sessions, the set size, and the identified id rule; the seed integration test asserts summary visitors equals the stat and sessions > visitors.
- [x] scripts/seed-events.ts rebuilds the site's rollup after inserting.
- [x] Re-seed aivia (`npm run seed`); record the counts. Verify: npm run verify; npm run test:integration.

## Progress log
- 2026-09-05 — Created from TICKET-035.
- 2026-09-06 — Started; plan narrowed to same-day sessions and identified ids (see Context).
- 2026-09-06 — Generator done. Also fixed while here: the seed salted a visitor id by the loop day, but a late local evening lands on the next UTC day, so one anonymous id could span two UTC days, which the ingest never produces; the id is now salted by the session's UTC day. The rollup comparison test drops sessions that straddle UTC midnight from its fixture (the documented D-015 approximation) so it stays exact. Year at 40 visitors/day: 30,262 sessions over 24,752 visitors (1.22).
- 2026-09-06 — Re-seeded aivia: 183,293 rows wiped, 205,438 inserted, rollup rebuilt in 30 s.

## Handoff
Closed; see Verification and Outcome.

## Verification
```
npm run verify                                   # lint, typecheck, ticket check, 152 unit tests: pass
TEST_DATABASE_URL=... npm run test:integration   # 7 files, 43 tests: pass (seed test asserts sessions > visitors and visitors = stats.visitors)
set -a; . ./.env; set +a; npm run seed
  generated: rows 205438, sessions 30262, visitors 24752, bounce 18.3%, pageviews per session 2.43
  wiped 183293 seeded rows; analytics.events now holds 205438; daily rollup rebuilt in 30095 ms
```
Production, last 30 days after the re-seed: 3,067 unique visitors, 3,576 sessions (query on analytics.events, site 31).

## Outcome
Shipped: a share of visitors open a second session the same day (12% anonymous, 30%
identified); identified rows carry the user hash as visitor id, as the ingest does, so those
users hold one id across days; ids salted by the session's UTC day; `stats.visitors`; unit
and integration assertions; `npm run seed` rebuilds the site's daily rollup. aivia re-seeded.
Left out: cross-day returns for anonymous visitors, impossible under D-003. No follow-ups.
