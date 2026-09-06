# Bot traffic

**Status:** built (TICKET-075)
**Written:** 2026-09-06
**Ticket:** TICKET-075 · **Keys:** D-017

## 1. Why

Crawlers do not run JavaScript, so the browser tracker never sees one, and the collector drops
anything `isbot()` flags (TICKET-007). Every visit from an answer engine or an indexer is
invisible in Lynq today.

That gap matters more each month. When ChatGPT or Perplexity fetches a documentation page to
answer someone, that is a visit the site earned and cannot see. And the question owners actually
argue about, *is this crawler answering a question or training a model*, is one nobody presents
clearly. Lynq can, because the two use different user agents.

## 2. Shape

Crawler requests reach the customer's server, not a browser, so the reporter has to live there:

```
customer's app  ──▶  middleware snippet  ──▶  /api/bots  ──▶  analytics.crawler_days
   (a request)        coarse bot-shaped       API key with        one row per
                      filter; sends UA+path   the ingest scope    site, day, crawler, path
```

The middleware never blocks the response. It reports after the response is sent (`waitUntil` on
Vercel, `queueMicrotask` elsewhere) and fails silently: a site whose analytics endpoint is down
must still serve its pages.

## 3. Decisions to take before code

### 3.1 Human requests are not reported (recommended)

The ticket as filed said server-side request analytics could ride along on the same middleware:
count every request, humans included, by route and status.

**That should not ship on this path.** A visitor who has opted out with `lynq.optOut()`, or whose
browser sends Global Privacy Control, is respected by the tracker and would be invisible to it,
yet the middleware would count them anyway. Lynq would be collecting behaviour from people who
declined, which is exactly the thing the product says it does not do, and the privacy page would
become untrue.

So: the middleware reports **only requests it classified as a bot**, and the docs say so plainly.
Server-side analytics for humans is a separate product decision with its own consent story, and
it should not arrive as a side effect of a bot feature.

### 3.2 A documented snippet before a published package (recommended)

The ticket assumed an npm package. A package means an npm account, a release process, versioning
and a support surface, for about thirty lines of code.

Ship a **copy-paste middleware snippet in the docs** first, one per framework, the way the
tracking snippet works. Publish `@lynq/next` when someone asks for it. Nothing about the endpoint
or the table changes when that happens.

### 3.3 Classification happens at the collector, not in the snippet

The snippet sends the user agent and the path; Lynq decides what they mean. If the snippet
classified, every crawler that appeared after a customer installed it would be missed until they
upgraded. The referrer map already works this way and for the same reason.

The snippet does carry one **coarse, bot-shaped filter** (a permissive regular expression:
`bot`, `crawl`, `spider`, `-user`, the link-preview names, the HTTP libraries), so that a request
from a person never leaves the customer's server (§3.1). Anything the filter lets through that
Lynq does not recognise as a bot is dropped at the collector. A new crawler with an ordinary
crawler-shaped name is caught; one that disguises itself as a browser is not, and would not be
by a stricter snippet either.

## 4. What is stored

`analytics.crawler_days`, one row per site, day, crawler and path, with a counter:

| Column | |
|---|---|
| `site_id`, `day` | the UTC day |
| `crawler` | display name, e.g. `ChatGPT`, `GPTBot`, `Googlebot` |
| `family` | `answers` · `training` · `search` · `social` · `seo` · `other` |
| `path` | the path requested, or `robots.txt` / `llms.txt` / `sitemap` when it is one of those |
| `hits`, `last_status` | count for the day, and the last HTTP status seen |

Primary key on (site, day, crawler, path), and the endpoint upserts with `hits = hits + n`. A
crawl of ten thousand pages is ten thousand rows for the day, not ten thousand rows per hour, and
it never touches `analytics.events`, so no visitor number can move because a crawler visited.

Retention is the same fixed 24 months as `analytics.events`, trimmed by `housekeeping()`.

## 5. Families, and why the split is the point

| Family | What it means | Examples |
|---|---|---|
| `answers` | fetching a page now, to answer someone | ChatGPT-User, OAI-SearchBot, PerplexityBot, Claude-User |
| `training` | collecting pages for a model | GPTBot, ClaudeBot, CCBot, Google-Extended, Bytespider |
| `search` | classic indexing | Googlebot, bingbot, DuckDuckBot, Applebot |
| `social` | link unfurling | Slackbot, Discordbot, Twitterbot, facebookexternalhit |
| `seo` | third-party crawlers | AhrefsBot, SemrushBot, DotBot |
| `other` | matched `isbot` but nothing else | |

The list lives in `lib/ingest/crawlers.ts` beside the referrer map, with a unit test of real user
agent strings. Matching is on the user agent only: verifying a crawler is genuinely Googlebot
needs reverse DNS, which v1 does not do, and the docs say the name is what the crawler claimed.

## 6. The screen

A **Bots** screen, shown in the nav only when the site has crawler rows, so nobody carries an
empty tab. It answers, in order:

- Hits by family over the range, as a split bar: answers against training is the headline.
- Crawlers ranked, with hits, pages touched and last seen.
- Pages ranked by crawler hits, filterable to one family.
- A short line for the orientation requests: `robots.txt`, `llms.txt` and sitemap fetches, which
  say a crawler is looking for instructions.

## 7. Endpoint

`POST /api/bots`, `Authorization: Bearer <key>` with the `ingest` scope (D-017), body a batch of
`{ ua, path, status, at }` up to 50. It resolves the key to a site, classifies each entry, drops
anything `isbot()` does not flag, and upserts. It returns 202 always after the gates, like the
collector. Rate limited per key: 120 requests a minute, counted in a shared Postgres row so
every server instance sees the same count (TICKET-086).

## 8. Out of scope for v1

Reverse-DNS verification of crawler identity; human request analytics (§3.1); a published npm
package (§3.2); alerting on a crawler that suddenly stops; and blocking or rate-limiting crawlers,
which is a firewall's job and not an analytics product's.
