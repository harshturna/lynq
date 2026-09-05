# TICKET-044: Live route and Realtime screen

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
/api/live/[site] serves realtime data outside the auth proxy, and /[site]/realtime renders visitors now, the 30-minute bars, live pages, sources, countries and the activity feed with the polling and pause rules.

## Context
- Design §8.2 (5-minute now, pause control, feed not a live region, throttled status, back-off, saveData, stop after 15 minutes), §9.4 (realtime primitive on received_at), §10 (route handler verifies the session itself; proxy.ts negative lookahead; unauthenticated handling with the banner). Depends on TICKET-034, TICKET-035.
- Read on start (2026-09-05): the approved mock is the "Realtime" screen in the TICKET-025
  set. The realtime primitive gains a window (30 or 60 minutes, `view.realtime`), the
  previous window's pageviews (the CTE spans two windows), custom event counts and the top
  three names, and the site's last received_at for the empty state. lib/screens/live.ts
  holds the one function both the page and the route call (site, filters from the URL,
  window) and a non-throwing authoriser for the route (getUser, the websites row, authorize),
  returning `{ kind: "ok" | "unauthenticated" | "forbidden" }`. app/api/live/[site]/route.ts
  is excluded from proxy.ts's matcher. The page renders the first result on the server; the
  client polls the route with the §8.2 rules: 10 s, Pause / Resume persisted in
  sessionStorage, back-off to 30 s then 60 s after five unchanged polls, 60 s when
  navigator.connection.saveData is on, paused while the tab is hidden, stopped after 15
  minutes without interaction behind "Resume live updates"; the feed accumulates new rows
  behind "N new events, show"; only the visitors-now number is role="status", announced at
  most once per 30 s; the per-minute chart does not animate; an unauthenticated result stops
  polling and shows the sign-in banner with redirectTo. ScreenHeader gains `pickers={false}`
  and a `subtitle` for the segment-driven screens.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] Route handler with session check and discriminated result; proxy matcher entry.
- [x] lib/screens/realtime.ts; route; polling hook with pause, back-off, hidden-tab pause, saveData, 15-minute stop; feed with the new-events button.
- [x] Verify: npm run verify; integration; a live check with the tracker running against a local server.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; Context brought up to date.
- 2026-09-05 — Landed. Walk-through findings, fixed: the poll hook kept its own data when a new
  server render arrived (the window switch while paused showed the old window), so it adopts
  fresh props; the segment's values "30m" / "1h" were dropped by the URL parser, whose view
  values must start with a letter (now "half" / "hour"). The route handler imports
  searchParamsToInput from lib/url-state, where it moved from the client provider.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed; next is TICKET-045 (Settings).
- **Blocked on:** nothing.
- **Next:** TICKET-045.
- **Read first:** lib/screens/live.ts; app/(main)/[website_slug]/realtime/_realtime/use-live.ts.

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:integration
```
verify: lint, typecheck, ticket check, 32 files / 150 unit tests. Integration: the realtime
test now asserts pageviews, the previous window, custom counts, event names and last_at
(query suite 23 tests). Live check on `next dev -p 3005` with four rows injected into the
demo site through the pooler (two visitors, a signup_start, then removed): the anonymous
route returns 401 `{"kind":"unauthenticated"}`; as guest the screen reads 2 visitors now,
3 pageviews ▲new, 1 event (1 signup_start), three bars in the last five minutes, Pages /
Sources / Countries lists and a four-row feed; two polls of /api/live within 11 s; Pause
shows Resume and writes sessionStorage; Last hour writes `view.realtime=hour`, the route
and the page return 60 minutes and the tile reads "last hour"; Session from the feed opens
the drawer with two steps; no console errors at 1280 or 390 px.

## Outcome
Shipped: /api/live/[site] outside the proxy with a discriminated result; /[site]/realtime
with the window segment, the polling hook (pause, back-off, saveData, hidden tab, idle
stop, signed-out banner), the held-back feed and the throttled status; the realtime
primitive's window, previous pageviews, event names and last-seen. Left out: the back-off,
saveData and 15-minute paths were not exercised in the walk-through (they need minutes of
wall time); they are small and read-tested. No follow-up tickets.
