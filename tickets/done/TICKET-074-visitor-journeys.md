# TICKET-074: Visitor journeys

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** feature

## Goal
A session can be opened as a timeline, pageview by pageview and event by event, from the Realtime feed, a goal's converting sessions, or a table row, so "what did the people who converted actually do" has an answer.

## Context
- From the DataFast review ("visitor journeys"); Phase 3 in the roadmap alongside funnels,
  paths and retention. The query layer has `rows(ctx, "session" | "sessions", opts)`
  (lib/query/primitives.ts rowsQuery, with visitorId and sessionId options) and the sessions
  CTE (lib/query/sessions.ts); there is no screen or drawer for a single session yet.
- Design work first: where the journey opens (a drawer over the current screen, as the
  "show all" drawer does, or its own route), what a row shows (time, path or event name,
  engaged time, the referrer on the first pageview), and how it is reached from Realtime,
  Goals and Events. Anonymous visitors have one id per day (D-003), so a journey is one
  session or one day at most; identified users can span days.
- Not small: needs a design section, mocks (D-010) and an e2e spec.
- **Reality check on 2026-09-06:** the drawer exists (`components/shell/session-drawer.tsx`,
  `lib/screens/session.ts`, `session=` in the URL on any screen, the layout mounts it) and
  Realtime's feed and the Events screen's recent occurrences already open it. What is missing
  is the two doors people want most and a step inside: **designed in
  `docs/design/visitor-journeys.md`**, mocked in scratchpad `journeys-mock.html`.
- Files read for the plan: `lib/query/primitives.ts` (`rowsQuery`, the `sessions` kind and
  `RowsOptions`), `lib/query/sessions.ts` (`sessionCte`, whose HAVING gains an extra predicate),
  `lib/query/goals.ts` (`goalPredicate`), `lib/screens/session.ts`, `lib/screens/goals.ts`
  (`SelectedGoal`), `lib/screens/pages.ts` (`SelectedPage`, the scoped context),
  `goals/_goals/selected.tsx`, `pages/_pages/selected.tsx`, `events/_events/selected.tsx` (the
  occurrence list the new list mirrors), `realtime/_realtime/live.tsx` (`openSession`),
  `components/shell/drawer.tsx`, `lib/url-state.ts` (`session`), `tests/e2e/app/events.spec.ts`,
  `goals.spec.ts`, `pages.spec.ts`, docs `counting.mdx`, `goals.mdx`, `product/_meta.js`,
  `app/(landing)/_landing/panels.tsx` (`RealtimePanel`).

## Plan
- [x] Design section: `docs/design/visitor-journeys.md`; mock `journeys-mock.png`.
- [x] Query: `sessionCte` takes an extra HAVING predicate; `rowsQuery("sessions")` gains `goal` (converting sessions) and honours `visitorId` (a visitor's sessions); a `SessionSummary` shape shared by the list and the drawer. Integration test on the fixture: converting sessions all contain the goal, a visitor's list holds the drawer's own session.
- [x] `components/shell/session-list.tsx`: the row (started, country · device, entry → exit, pages · engaged, Session). Goals: "Converting sessions" on the selected goal (`SelectedGoal.recent`). Pages: "Recent sessions on this page" (`SelectedPage.recent`).
- [x] Drawer: "Also today" under the timeline (`SessionTimeline.others`), choosing one replaces the `session` param; the one-day sentence when empty.
- [x] e2e: from a goal to a session; from a page to a session; "Also today" swaps the drawer.
- [x] Docs: `product/journeys.mdx`; counting.mdx Sessions and goals.mdx link it; home "What you get" line; `_meta.js`.
- [x] Landing: a Journeys panel (one timeline with an event pill and the Also-today line) and a Feature lead.
- [x] Verify: npm run verify; npm run test:integration; npm run test:e2e.

## Progress log
- 2026-09-06 — Created from the DataFast follow-up review.
- 2026-09-06 — Found the drawer and two of the doors already built; designed the missing two and "Also today"; mocked; started.
- 2026-09-06 — Built. `sessionCte` takes `alsoHaving` and `visitorId`; `rowsQuery("sessions")` gains `goal`, which adds the goal's predicate as a second `bool_or` in the HAVING so the screen's own filters stay in force (a path filter still means "sessions that saw the page"); `sessionList()` in run.ts returns the shared `SessionSummary`. `components/shell/session-list.tsx` (row + list) on the selected goal and the selected page; the drawer's "Also today" lists the visitor's other sessions that UTC day and swaps the drawer in place. `primitives.ts` now imports `goalPredicate` from `goals.ts`, which imports `primitives.ts`; both uses are inside functions, so the cycle is harmless, and the unit and integration suites agree.
- 2026-09-06 — e2e: the goals table names its row button by the goal's name alone, and a `Section` is not a landmark, so the spec finds the lists by heading and the Session buttons by exact name. Looked at the list and the drawer on the fixture; the newest "converting session" is the fixture's live clone (one custom event, no pageview), which the row shows honestly as "0 pages · 0s".

## Handoff
- **State:** shipped and closed.
- **Blocked on:** nothing.
- **Next:** none for this ticket.
- **Read first:** docs/design/visitor-journeys.md, components/shell/session-list.tsx

## Verification
```
npm run verify                                   # 0 errors (18 pre-existing warnings), typecheck clean, 88 tickets, 238 unit tests passed
TEST_DATABASE_URL=… npm run test:integration     # 14 files / 69 tests passed (journeys: goal-narrowed lists, filters on top, a visitor's day); budgets unchanged
TEST_DATABASE_URL=… npm run test:e2e             # 90 passed (journeys.spec.ts: goal → session → Also today; page → session)
cd ../lynq-docs && npm run build                 # built
```
Looked at: scratchpad `journeys-mock.png` (mock), `journeys-list-1280.png` and `journeys-drawer-1280.png` (built, on the fixture).

## Outcome
Shipped: converting sessions on a selected goal, recent sessions on a selected page, "Also today" in the session drawer, the query options behind them (`goal` and `visitorId` on the sessions rows, `sessionList()`), the docs page `product/journeys.mdx` with links from counting, goals and the home list, and the landing Journeys panel. No migration; nothing new collected.

Left out, per the design: a journeys screen or a sessions table; cross-day journeys for identified users (needs its own decision); anything beyond the pageviews and events already stored. Follow-ups: none.
