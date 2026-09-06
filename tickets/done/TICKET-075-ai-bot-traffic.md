# TICKET-075: AI bot traffic

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** feature

## Goal
A site can see which crawlers fetch which pages: AI answer engines (ChatGPT, Claude, Perplexity), search indexers (Google, Bing) and training crawlers, by page and by day, with robots.txt, llms.txt and sitemap requests called out.

## Context
- From the DataFast review; Phase 3 in the roadmap. The browser tracker never sees bots (they
  do not run scripts), and the collector drops anything isbot flags (TICKET-007), so this is a
  separate ingest path: a tiny server-side package (Next middleware first, since that is what
  the owner's sites run) that posts crawler requests to a new endpoint, keyed by the site, with
  the user agent classified into a crawler table.
- Storage: its own table (analytics.crawler_hits: site_id, ts, crawler, family, path, status),
  not analytics.events, so bot rows never touch the visitor numbers or the rollup. A Bots screen
  or a section on Sources; decide in the design.
- Server-side request analytics rides on the same middleware (owner, 2026-09-06, verticals
  review): the package also counts human requests by route and status with p75 server timing,
  as one more family in the same table, joined to the front-end pageview by the daily hash.
  Design it in the same section so the endpoint, the table and the settings switch serve both.
- **Designed 2026-09-06: `docs/design/bot-traffic.md`.** Read it before the plan below; it is the
  source of truth for the shape, the table, the families and the screen.
- Three things the design changed from this ticket as filed, each needing the owner's word:
  1. **Human requests are not reported.** Counting every server request would count people who
     opted out or who send Global Privacy Control, which the tracker respects and the privacy
     page promises. Server-side analytics for humans needs its own consent story and must not
     arrive as a side effect of a bot feature. The middleware reports only what it classified as
     a bot.
  2. **A documented middleware snippet before a published package.** An npm package means an
     account, releases, versioning and support for about thirty lines; the docs already carry a
     copy-paste snippet per framework for the tracker. Publish `@lynq/next` when asked for.
  3. **Storage is a daily counter, not one row per hit.** `analytics.crawler_days` keyed by
     (site, day, crawler, path) with `hits = hits + n` on conflict. A ten thousand page crawl is
     ten thousand rows for the day rather than per hour, and it never touches `analytics.events`.
- Classification happens at the collector, not in the snippet, so a crawler that appears after a
  customer installs is not missed until they upgrade. Same reason as the referrer map.
- Authentication is settled: an API key with the `ingest` scope (D-017, TICKET-085).
- **Owner confirmed both recommendations on 2026-09-06: D-018.** Human requests are never
  reported; the reporter is a documented snippet, not a package; storage is the daily counter.
- Retention: `housekeeping()` trims `analytics.events` at a fixed 24 months (the per-site
  `retention_months` column exists but nothing reads it yet), so `crawler_days` gets the same
  fixed line rather than inventing per-site retention here.
- Follow-up: TICKET-086 (a per-key rate limit that holds across instances; this ticket's limiter is in-memory per instance).
- Files read for the plan: `lib/ingest/referrers.ts` and its test (the map this one mirrors),
  `lib/ingest/collect.ts` (the `isbot()` gate at step 4), `lib/api-keys.ts` (`resolveApiKey`,
  `bearerToken`, `hasScope`), `app/api/collect/route.ts` (the 202 shape), the housekeeping
  function in `supabase/migrations/20260906000000_daily_rollup.sql`, and
  `tests/integration/schema.integration.test.ts` (the table list that must gain `crawler_days`).

## Plan
- [x] Design section: `docs/design/bot-traffic.md`.
- [x] Decision: D-017, per-site API keys, taken in TICKET-085; this ticket uses the `ingest` scope.
- [x] Owner's word on the three changes in Context, then a D-NNN for the ones that stick (human requests out; snippet before package): D-018.
- [x] `lib/ingest/crawlers.ts`: user agent to crawler and family, beside the referrer map, with a unit test of real user agent strings.
- [x] Migration: `analytics.crawler_days` and its retention line in `housekeeping()`.
- [x] `POST /api/bots`: key with the `ingest` scope, batch of up to 50, classify, drop anything `isbot()` does not flag, upsert, 202. Enforce the D-017 rule that a key is refused on a browser origin, which this is the first endpoint to need.
- [x] Query and screen: families as a split bar, crawlers ranked, pages ranked, the orientation line. Shown in the nav only when the site has rows.
- [x] Mock the screen at 1280 and 375 with real numbers before wiring (D-010).
- [x] Docs: an install page per framework for the middleware snippet, a Using Lynq page on the Bots screen and the families, an API keys mention, and a privacy page note that crawler hits are stored separately from visits and carry no person.
- [x] Landing: a feature panel ("See which AI assistants read your site") and a "What you get" line. First AI-facing feature; nothing on the landing or docs mentions AI today.
- [x] Verify: npm run verify; npm run test:integration; npm run test:e2e.

## Progress log
- 2026-09-06 — Created from the DataFast follow-up review.
- 2026-09-06 — Designed. Writing it up moved three things (see Context), the significant one being that reporting human requests server-side would collect from people who opted out.
- 2026-09-06 — Owner said yes to both. Recorded as D-018. Started.
- 2026-09-06 — Crawler map and `crawlerPath()` with 38 unit cases on real user agent strings; the map lives in `lib/ingest/crawlers.ts` and the client-safe families, labels and orientation names in `lib/crawler-families.ts` so the isbot list never ships to the browser. A bot isbot flags but the list does not name is filed under `other` with the token that gave it away as its name.
- 2026-09-06 — Retention: `housekeeping()` trims events at a fixed 24 months and reads nothing per site, so `crawler_days` gets the same line; the design's "site's own setting" sentence corrected.
- 2026-09-06 — `/api/bots` as `handleBots()` in `lib/ingest/bots.ts`, a function of its inputs like the collector: browser Origin refused before the key is even looked at (D-017, first endpoint to need it), key and `ingest` scope, in-memory per-key limiter (120 batches/min per instance; TICKET-086 for a shared one), body and batch caps, then fold to (day, crawler, path) and upsert with `hits = hits + n`. Middleware has no status before the response, so `status` and `at` are optional.
- 2026-09-06 — The snippet carries a coarse bot-shaped regex so a person's request never leaves the customer's server (D-018 literally), and Lynq still does the real classification (§3.3). Design doc amended.
- 2026-09-06 — Mocked at 1280 and 375 (scratchpad `bots-mock.html`), then built: lead (pool, ramp split by family, sentence answering answers-against-training, top crawler, llms.txt readers), Crawlers with the family beside the name, "Looking for instructions", Pages with All/Answers/Training/Search views through the `bots` view region. Social, SEO and Other are not offered as page views: the question the table answers is what AI and search fetch. No compare, no filters (a hit has none of the dimensions), UTC days; `ScreenHeader` gained a `filters` prop for it.
- 2026-09-06 — Nav and command menu show Bots only when `Site.bots` is true, an `exists` on `crawler_days` folded into the settings query in `authorize()`.
- 2026-09-06 — Seed: `scripts/seed/crawlers.ts` generates crawler days; the e2e fixture and `npm run seed` (new `--no-bots` flag) write them. `periodPhrase()` moved to `lib/screens/period.ts` for both Pages and Bots.
- 2026-09-06 — Schema integration test made robust to a warm container that already holds today's salt.
- 2026-09-06 — Migration pushed to production; table and housekeeping confirmed there. No production crawler rows written: the demo site's rows would be fake and the owner's real site has no middleware yet.

## Handoff
- **State:** shipped and closed.
- **Blocked on:** nothing.
- **Next:** none for this ticket; TICKET-086 for the shared rate limit.
- **Read first:** docs/design/bot-traffic.md

## Verification
```
npm run verify                                   # lint 0 errors (18 warnings, all pre-existing), typecheck clean, 85 tickets, 41 files / 223 unit tests passed
TEST_DATABASE_URL=… npm run test:integration     # 10 files / 54 tests passed; budgets unchanged (attention 26 ms, influence 68 ms)
TEST_DATABASE_URL=… npm run test:e2e             # tracker + app: 82 passed, 1 failed on a wrong locator in bots.spec.ts, fixed;
                                                 #   rerun of app:setup + bots.spec.ts: 7 passed
npx supabase db push --linked                    # 20260906030000_crawler_days.sql applied; columns and housekeeping confirmed in production
cd ../lynq-docs && npm run build                 # static export built
```
Screens looked at: scratchpad `bots-mock-1280.png` / `bots-mock-375.png` (mock), `bots-live-1280.png` / `bots-live-375.png` (the built screen on the e2e fixture).

## Outcome
Shipped: the crawler map (`lib/ingest/crawlers.ts`, `lib/crawler-families.ts`), `analytics.crawler_days` and its housekeeping line (migration `20260906030000_crawler_days.sql`, in production), `POST /api/bots` (`lib/ingest/bots.ts`, `app/api/bots/route.ts`) keyed by D-017 keys with the ingest scope and the first enforcement of the browser-Origin refusal, the Bots reads (`lib/query/crawlers.ts`, `run.ts`), the Bots screen (`lib/screens/bots.ts`, `app/(main)/[website_slug]/bots/`), shown in the nav and the command menu only when a site has rows, the seed generator and fixture rows, unit, integration and e2e tests, the landing "Bots" feature panel, and docs: `install/bots.mdx` (Next.js middleware and Express snippets, check-it-works), `product/bots.mdx`, the privacy page's Crawlers section, the home page's "What you get" line, and the API keys scope row.

Left out, on purpose: a published `@lynq/next` package (D-018, on demand); reverse-DNS verification of crawler identity (design §8); Social, SEO and Other as Pages views; a compare mode and filters on the screen; any production crawler rows (the owner can run `npm run seed` for the demo site, or install the snippet on a real site). The per-key limiter is in memory per instance.

Follow-ups: TICKET-086 (shared rate limit for keyed endpoints).
