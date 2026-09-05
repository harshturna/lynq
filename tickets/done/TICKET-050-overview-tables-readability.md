# TICKET-050: Overview tables rank one metric; changes in a slot; teal lead line

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
The Overview's three tables and lead chart read at a glance (D-010): one ranked metric per table with a share bar, changes in a fixed slot with only the triangle coloured, view tabs underlined on the table rule, a teal lead line with the previous period behind it.

## Context
- D-010 records the choice and the audit artifact. Owner's words: "numbers don't align, it's
  so hard to read ... it's all so congested"; chose the teal chart and table variant D; asked
  that the view tabs' underline sit on the divider like the top nav's.
- Files read: components/shell/data-table.tsx (columns, rows, tablist with `border-b-2` on
  the link, `DeltaText` inline in every numeric cell, footer with Show all / Export CSV);
  components/shell/badge.tsx (`deltaOf` with `points`, `DeltaText` used only by the table);
  components/shell/data-table.test.tsx (asserts deltas when compare is on, tabs, roving
  rows); lib/charts/line.ts and line.test.ts (ink primary, dotted compare, area 4.5%);
  components/shell/top-nav.tsx (active item: `border-b-2` overlapping the bar's rule);
  app/(main)/[website_slug]/_overview/tables.tsx (columns per view, SHOWN 8, drawer).
- Changes: DataTable gains `lead?: string` (the one column shown, with a share bar scaled to
  the largest value and a "Details" header link that opens the drawer), a `points?` column
  flag, a change slot `<td>` per numeric column when compare is on (replacing DeltaText,
  which is deleted), and a header row whose tablist underlines on the table's top rule. The
  Overview passes `lead` per view and `points` on bounce and conversion. lineOption: teal
  primary with a vertical gradient area, `smooth`, previous period solid in the compare
  colour behind, last point marked; the `color: "ink"` option stays for callers that want
  it. Tests updated alongside.
- Ruled out: a per-table toggle for all columns (D-010); changing the section screens'
  column sets (they keep full tables and only adopt the slot rule).

## Plan
- [x] DataTable: change slot, points, lead mode with share bar and Details, tabs on the rule; tests.
- [x] lineOption: teal gradient, smooth, solid compare behind, last point; tests.
- [x] Overview tables.tsx: lead per view, points; /ui preview still renders.
- [x] Verify: npm run verify; guest walk-through at 1280 and 390 px with screenshots.

## Progress log
- 2026-09-05 — Created from the owner's review of TICKET-035; D-010 recorded; started.
- 2026-09-05 — Landed: DataTable `lead` mode (one column, share bar scaled to the largest
  value, Details link in the header, 36 px rows, Show all hidden), a change slot `<td>` per
  numeric column when compare is on (ChangeSlot in badge.tsx replaces DeltaText; mute text,
  coloured triangle, "—" for nothing to compare), `points` on rate columns, the tablist
  underlining on the table's top rule (the th top rule moves to the header row). lineOption:
  teal primary over a vertical gradient, `smooth` with `smoothMonotone: "x"` (plain smoothing
  overshot on flat stretches), previous period solid grey behind, last point marked. Two
  walk-through fixes: `bg-teal-soft/70` generated no class because Tailwind cannot apply an
  alpha modifier to a variable colour (now `bg-teal-soft opacity-80`); the curve overshoot.

## Handoff
- **State:** Closed; next is TICKET-036 (sites list).
- **Blocked on:** nothing.
- **Next:** TICKET-036.
- **Read first:** D-010; components/shell/data-table.tsx (`lead`, change slot).

## Verification
```
npm run verify
```
lint (38 pre-existing warnings), typecheck, ticket check (50 tickets), 31 files / 148 unit
tests passed (data-table: change slot assertions and a new lead-mode test; line: teal,
solid compare, ink option, last point marked). Guest walk-through on `next dev -p 3005`
against production data at 1280 and 390 px: one ranked column per table with share bars,
"vs prev" slots with coloured triangles, tabs underlined on the rule, Details opening the
full drawer (19 rows, five columns), the teal lead line with the grey previous period
behind; no console errors. Screenshots reviewed at both widths.

## Outcome
Shipped: D-010 in code for every DataTable and every line chart; the Overview's three tables
in lead mode with bounce and conversion in points; the tablist on the rule. Left out:
nothing. No follow-up tickets.
