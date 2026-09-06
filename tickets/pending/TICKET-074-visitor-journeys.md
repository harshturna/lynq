# TICKET-074: Visitor journeys

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
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

## Plan
- [ ] Design section in docs/design (Phase 3 doc when it exists): entry points, the drawer, keyboard and a11y.
- [ ] Query: a session timeline primitive over `rows` with the entry attribution.
- [ ] Drawer component; entry points from Realtime, Goals and the Events screen.
- [ ] Verify: npm run verify; npm run test:integration; npm run test:e2e.
- [ ] Docs: a Using Lynq page ("Journeys") on what a journey shows, how to open one, and the one-day limit for anonymous visitors; product/counting.mdx links it from Sessions.
- [ ] Landing: a staged panel (D-014 pattern) showing one journey timeline, with a one-line lead; the docs home's "What you get" list gains the line.

## Progress log
- 2026-09-06 — Created from the DataFast follow-up review.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** a Phase 3 design section
- **Next:** —
- **Read first:** lib/query/primitives.ts (rowsQuery), components/shell/drawer.tsx

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
