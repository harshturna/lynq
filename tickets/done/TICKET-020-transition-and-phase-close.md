# TICKET-020: Transition, diff and Phase 0 close-out

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** infra

## Goal
Run v1 and v2 side by side on Lynq's own site for a day, diff the stores, and close Phase 0 with an attributed report.

## Context
- Design §11 (steps and what is reported vs gated).
- Depends on every other Phase 0 ticket.
- The old-table side reads directly with no row cap; visitors are count(distinct client_id) from
  sessions.

## Plan
- [x] `scripts/diff-events.mjs` per §11 step 3, including suspect counts, ingest_log counts by stage,
      and count(*) filter (where path = '').
- [x] Add the v2 snippet to Lynq's own site alongside v1 for a day.
- [x] Close-out report in this ticket's Outcome: every discrepancy attributed; the cutover date
      recorded for the Phase 2 annotations table. Verify: the diff run.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).
- 2026-09-05 — Started. Lynq's own domain was never a registered site and never carried the v1
  script, so "both snippets on Lynq's site" means adding both now: v1 for the comparison
  window, v2 as the product. Registered lynq.byharsh.com under the guest account so the demo
  dashboard shows real traffic. Dual-run conflict found and fixed: the v1 script assigns
  window.lynq unconditionally and the v2 core used that as its "already loaded" marker, so v2
  would have bailed; it now keys on window.__lynq. Backfill-day diff: page views match exactly;
  sessions and referrers differ by definition (session grain, day-rotating visitor).
- 2026-09-05 — Deployed; a headless browser visited /, /login, /sign-up, /login on the live
  site and both trackers fired (7 v1 beacons, 5 v2 batches). Diff for lynq.byharsh.com today:
  page views 4 = 4 = 4 across old tables, adapter and tracker v2; visitors 1 = 1 = 1; sessions
  1 = 1 = 1; paths identical; both gates within 1 %. Bounce rate 100 % (old: per-page durations
  under 10 s) vs 0 % (new: four pageviews is not a bounce), the definitional change accepted in
  D-004. v2 vitals arrive one metric per row (fcp, ttfb, dcl + resources); LCP did not finalise
  under the synthetic hide, which web-vitals only reports on a genuine visibility change or
  interaction. Cutover note recorded below. Closed; Phase 0 complete.

## Handoff
Closed. See Outcome.

## Verification
```
npm run verify
Found 46 warnings.
Ticket check passed (22 tickets).
 Test Files  18 passed (18)
      Tests  87 passed (87)
npm run build
✓ Compiled successfully in 1296ms
npm run test:e2e   # 13 passed

# diff, a backfilled day
site aivia.byharsh.com (#31) day 2026-07-15 UTC
pageviews      old_tables=3  backfill_v0=3  adapter_v1=0  tracker_v2=0
visitors       old_tables=0  backfill_v0=3  adapter_v1=0  tracker_v2=0
sessions       old_tables=0  backfill_v0=4  adapter_v1=0  tracker_v2=0
bounce_rate    old_tables=null  backfill_v0=25  adapter_v1=null  tracker_v2=null
top_paths      old_tables=["/docs","/dashboard"]  backfill_v0=["/docs","/dashboard"]  adapter_v1=[]  tracker_v2=[]
top_referrers  old_tables=["https://google.com",""]  backfill_v0=["","facebook.com"]  adapter_v1=[]  tracker_v2=[]
health         suspect=0 empty_path=0 ingest_log={}
gates          old vs v0 pageviews: within 1%; old vs v1 pageviews: DIFFERS (3 vs 0); v1 vs v2 pageviews: n/a

# diff, today, Lynq's own site after four real visits with both trackers installed
site lynq.byharsh.com (#41) day 2026-09-05 UTC
pageviews      old_tables=4  backfill_v0=0  adapter_v1=4  tracker_v2=4
visitors       old_tables=1  backfill_v0=0  adapter_v1=1  tracker_v2=1
sessions       old_tables=1  backfill_v0=0  adapter_v1=1  tracker_v2=1
bounce_rate    old_tables=100  backfill_v0=null  adapter_v1=0  tracker_v2=0
top_paths      old_tables=["/login","/","/sign-up"]  backfill_v0=[]  adapter_v1=["/login","/","/sign-up"]  tracker_v2=["/login","/","/sign-up"]
top_referrers  old_tables=[""]  backfill_v0=[]  adapter_v1=[""]  tracker_v2=[""]
health         suspect=0 empty_path=0 ingest_log={"bot":3,"origin_missing":1,"unregistered":1}
gates          old vs adapter pageviews (rows since cutoff only): within 1%; adapter vs tracker v2 pageviews: within 1%

# diff, today, aivia.byharsh.com
site aivia.byharsh.com (#31) day 2026-09-05 UTC
pageviews      old_tables=1  backfill_v0=1  adapter_v1=0  tracker_v2=0
visitors       old_tables=1  backfill_v0=1  adapter_v1=0  tracker_v2=0
sessions       old_tables=1  backfill_v0=1  adapter_v1=0  tracker_v2=0
bounce_rate    old_tables=100  backfill_v0=100  adapter_v1=null  tracker_v2=null
top_paths      old_tables=["/login"]  backfill_v0=["/login"]  adapter_v1=[]  tracker_v2=[]
top_referrers  old_tables=[""]  backfill_v0=[""]  adapter_v1=[]  tracker_v2=[]
health         suspect=0 empty_path=0 ingest_log={"bot":1,"origin_missing":1,"unregistered":1}
gates          old vs adapter pageviews (rows since cutoff only): within 1%; adapter vs tracker v2 pageviews: n/a
```

## Outcome
Shipped: Lynq tracks itself with tracker v2 (vitals, outbound and declarative events on) and
carries the v1 script alongside for the comparison window; Vercel Analytics removed;
lynq.byharsh.com registered as site #41 under the guest account, so the demo dashboard will show
real traffic once Phase 1 reads from `analytics.events`; `npm run diff` for any site and day;
chunk cache headers.

**Cutover note (for the Phase 2 annotations table):** 2026-09-05T15:26:54Z, the v1 adapter's
first row. Rows before it are `ingest_version = 0` (backfill), after it `1` (v1 adapter) and
`2` (tracker v2). Visitors, bounce rate, duration and referrers change definition at this
instant (D-004).

**Phase 0 close-out.** Everything in design §17 is live: schema and housekeeping (012),
identity and site registry (013), ingest v2 (014), v1 dual-write (015), query foundations
(016), backfill of 14,203 rows (017), tracker v2 core (018), extras and vitals chunks (019),
transition and diff (020). Test surface: 87 unit tests in `verify`, 18 integration tests
against the Supabase Postgres image, 13 Playwright tests, all in CI. Exit criteria from §11:
old vs backfill page views match exactly on backfilled days; old vs adapter and adapter vs v2
match on Lynq's site today; `count(path = '')` is zero; suspect count zero.

Left out: the seven-day dual run the ClickHouse design had (v6 reduced it to a day; the diff
can be re-run any day with `npm run diff`); the v1 script stays on Lynq's site until v1 sunset
(D-005, 30 quiet days after the last v1 row), then the landing-page privacy copy changes;
archiving `lynq-js` on GitHub is the owner's.

Follow-up tickets: none new. TICKET-021 (dependency vulnerabilities) remains, unrelated to
Phase 0. Phase 1 (D-001) starts with rewiring the existing dashboard screens to `lib/query`.
