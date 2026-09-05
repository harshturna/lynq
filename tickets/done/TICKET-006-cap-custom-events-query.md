# TICKET-006: Cap the custom events query

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Area:** quality
**Completed:** 2026-09-05

## Goal
Stop a busy site from timing out the dashboard: the custom events query has no row limit while
page views and sessions are capped at 5,000.

## Context
- `lib/actions.ts` `getCustomEventData`: selects `*, sessions (*)` from `custom_events` for the
  range, ordered by created_at desc, no limit. It is called on every dashboard load and every
  date-range change (`app/(main)/[website_slug]/page.tsx`, `website-dashboard.tsx`).
- Custom events are stored one row per property, so an event with five properties is five rows.
  `groupEventsByEventId` in `lib/utils.ts` regroups them client-side. A row cap can therefore
  split the last event's properties; ordering by created_at desc puts that split at the oldest
  event in the window, which is the least important one.
- The Events tab (`event-dashboard.tsx`) renders a flat list with a text filter and shows
  "N events found". It has no pagination.
- Ruled out: a "load more" control. It needs a cursor through the client component and the
  Events tab is replaced wholesale by the roadmap's events explorer. Ruled out: grouping in SQL,
  same reason. Ruled out: a smaller cap than 5,000, to match the other queries' behaviour and
  the review's finding that all three fetches share the same ceiling.

## Plan
- [x] Read getCustomEventData, groupEventsByEventId, and the Events tab.
- [x] Add `.limit(5000)` after the order clause, with a comment on the property-row split.
- [x] Verify: `npm run verify`, `npm run build`.

## Progress log
- 2026-09-05 — Planned and started.
- 2026-09-05 — Limit added.

## Handoff
Closed. See Outcome.

## Verification
```
npm run verify
Found 44 warnings.
Ticket check passed (6 tickets).
npm run build
✓ Compiled successfully in 627ms
```

## Outcome
Shipped: custom events query capped at 5,000 rows, newest first.

Left out: pagination and a truncation notice in the Events tab, which the roadmap replaces.

Follow-up tickets: none.
