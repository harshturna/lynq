# TICKET-056: Active tab indicator sits on the rule

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
The teal mark under an active nav item or view tab covers the rule it belongs to, one line
that changes colour, instead of sitting a pixel above or below it.

## Context
- Owner, 2026-09-06: the mark "is always either under the black one or over it, just looks
  unpolished". Cause: components/shell/top-nav.tsx and components/shell/data-table.tsx give the
  active item its own `border-b-2` and nudge it with `-mb-px` or padding so it overlaps the
  container's 1 px rule; the nudge is a pixel off in each place.
- Fix: the item has no border. A `.tab-mark` utility in app/globals.css draws the mark as a 2 px
  absolutely positioned bar whose bottom edge is the rule's bottom edge (`bottom:-1px` on an
  element flush with the container's content box), shown when the item is `aria-current="page"`
  or `aria-selected="true"`. Nav links stretch to the header's height so they are flush.
- Same construction landed in the landing page mock (D-014 will cite it).

## Plan
- [x] `.tab-mark` in globals.css; top-nav NavLink and the More trigger; data-table view tabs.
- [x] Zoomed screenshot of both at 3x; verify; e2e a11y for both widths.

## Progress log
- 2026-09-06 — Created and started.
- 2026-09-06 — Landed. The nav needed one more thing: the `nav` element was centred in the header, so its links were not flush with the rule; it now stretches to the header's height.

## Handoff
- **State:** Closed.
- **Blocked on:** nothing
- **Next:** TICKET-057, the landing page
- **Read first:** app/globals.css

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npx playwright test a11y.spec overview.spec --project=app
```
verify: 33 files / 149 unit tests. e2e: 31 passed (every route axe-clean and without sideways
scroll at 1280 and 375, plus the Overview flow through the view tabs). Zoomed screenshots at
3x of the top nav and the Pages view tabs: the mark's bottom edge is the rule's bottom edge in
both.

## Outcome
Shipped: the `.tab-mark` utility and both places that draw the mark. Left out: nothing.
