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
- Needs a design section, a decision on the endpoint's authentication (a site key from
  settings; the same key TICKET-070's proxying page said does not exist yet), and a crawler
  user-agent list kept in the repo.

## Plan
- [ ] Design section: package shape, endpoint, table, screen.
- [x] Decision: D-017, per-site API keys, taken in TICKET-085; this ticket uses the `ingest` scope.
- [ ] Package, endpoint, table, screen, tests.
- [ ] Docs: an Install page for the server-side package (Next.js middleware first), a Using Lynq page on the Bots view and the crawler families, and a privacy page note that crawler hits are stored separately from visits.
- [ ] Landing: a feature panel ("See which AI assistants read your site") staged from the real Bots view, and a "What you get" line on the docs home. This is the first AI-facing feature; feature it, since nothing on the landing or docs mentions AI today.

## Progress log
- 2026-09-06 — Created from the DataFast follow-up review.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** a Phase 3 design section
- **Next:** —
- **Read first:** lib/ingest/collect.ts (how bots are dropped today), docs/design/phase-0-data-foundation.md §7

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
