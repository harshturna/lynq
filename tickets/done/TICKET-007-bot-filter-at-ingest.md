# TICKET-007: Drop known bot and crawler traffic at ingest

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Area:** quality
**Completed:** 2026-09-05

## Goal
Keep crawlers, headless browsers, and monitoring tools out of visitor, session, and page view
counts. Today nothing checks the user agent, so anything that executes the script is counted.

## Context
- `app/api/lynq/route.ts` receives beacons; the browser's User-Agent arrives as a request
  header. The tracker only sends its own coarse browser/OS detection in the body, which is not
  enough to identify bots.
- Detection: the `isbot` package (5.2.2, ~49 KB unpacked, regex list maintained against a
  public bot UA corpus). Chosen over a hand-written regex because the list is kept current and
  covers headless Chrome, Lighthouse, uptime monitors, and SEO crawlers. Missing user agent is
  treated as not-a-bot by isbot; real browsers always send one.
- Placement: after the origin check and before any database write, on every event type. A
  detected bot gets the normal success response so the caller learns nothing and retries
  nothing.
- Ruled out: filtering in the tracker. A bot that runs the script can lie in the body; the
  server-side header is the only signal worth having. Ruled out: logging or storing bot hits.
  No table for it and the roadmap's ingest rewrite will count them separately.

## Plan
- [x] Read the ingest route and confirm where the origin check ends.
- [x] `npm install isbot`.
- [x] In the route, after `await headers()`, return the success response when
      `isbot(requestHeaders.get("user-agent"))` is true.
- [x] Verify: `npm run verify`, `npm run build`, and a node check of isbot against a desktop
      Chrome UA, mobile Safari UA, Googlebot, HeadlessChrome, and an uptime monitor.

## Progress log
- 2026-09-05 — Planned and started.
- 2026-09-05 — isbot 5 installed, early return added after the headers read.

## Handoff
Closed. See Outcome.

## Verification
```
node isbot check
Chrome desktop   human (kept)
Safari iPhone    human (kept)
Googlebot        BOT   (dropped)
HeadlessChrome   BOT   (dropped)
UptimeRobot      BOT   (dropped)
Lighthouse       BOT   (dropped)
missing UA       human (kept)
npm run verify
Found 44 warnings.
Ticket check passed (7 tickets).
npm run build
✓ Compiled successfully in 1223ms
```

## Outcome
Shipped: `isbot` dependency; the ingest route returns the normal success response without
writing when the request's User-Agent is a known bot.

Left out: counting or storing bot hits; IP-based datacenter filtering. Both belong to the
ingest rewrite.

Follow-up tickets: none.
