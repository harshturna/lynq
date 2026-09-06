# TICKET-075: AI bot traffic

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
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

## Plan
- [x] Design section: `docs/design/bot-traffic.md`.
- [x] Decision: D-017, per-site API keys, taken in TICKET-085; this ticket uses the `ingest` scope.
- [ ] Owner's word on the three changes in Context, then a D-NNN for the ones that stick (human requests out; snippet before package).
- [ ] `lib/ingest/crawlers.ts`: user agent to crawler and family, beside the referrer map, with a unit test of real user agent strings.
- [ ] Migration: `analytics.crawler_days` and its retention line in `housekeeping()`.
- [ ] `POST /api/bots`: key with the `ingest` scope, batch of up to 50, classify, drop anything `isbot()` does not flag, upsert, 202. Enforce the D-017 rule that a key is refused on a browser origin, which this is the first endpoint to need.
- [ ] Query and screen: families as a split bar, crawlers ranked, pages ranked, the orientation line. Shown in the nav only when the site has rows.
- [ ] Mock the screen at 1280 and 375 with real numbers before wiring (D-010).
- [ ] Docs: an install page per framework for the middleware snippet, a Using Lynq page on the Bots screen and the families, an API keys mention, and a privacy page note that crawler hits are stored separately from visits and carry no person.
- [ ] Landing: a feature panel ("See which AI assistants read your site") and a "What you get" line. First AI-facing feature; nothing on the landing or docs mentions AI today.
- [ ] Verify: npm run verify; npm run test:integration; npm run test:e2e.

## Progress log
- 2026-09-06 — Created from the DataFast follow-up review.
- 2026-09-06 — Designed. Writing it up moved three things (see Context), the significant one being that reporting human requests server-side would collect from people who opted out.

## Handoff
- **State:** designed, not started. `docs/design/bot-traffic.md` is written; no code.
- **Blocked on:** the owner's word on the three changes in Context, chiefly whether human server-side requests stay out.
- **Next:** record the answer as a decision, then the crawler map and its unit test.
- **Read first:** docs/design/bot-traffic.md

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
