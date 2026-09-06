# TICKET-087: Note labels off the chart

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
Note markers never collide: the text leaves the plot for a strip under the chart and the tooltip, and the marker itself is a faint pin, so three notes in adjacent buckets read as three pins rather than three grey series with a label across them.

## Context
- TICKET-076 drew the note's text as the markLine label, with a rule that dropped labels on adjacent markers and hung the last one to the left. On the fixture at 90 days (weekly buckets, three seeded notes in three consecutive weeks) the surviving label ran across the neighbouring markers and the ink lines at 55% read as series. The owner saw it and asked for the fix (2026-09-06).
- Files: `lib/charts/line.ts` (the notes markLine: drop the label and the crowding rule, faint line, ink dot), `lib/charts/line.test.ts`, `components/charts/charts.tsx` (`LineChart` gains a visible strip under the chart listing the range's notes with their date), `app/(landing)/_landing/panels.tsx` (the panel's label moves under the chart too), `docs/design/notes-on-charts.md` §4, `../lynq-docs/src/pages/product/notes.mdx` "What it marks".
- The hidden table's Notes column and the tooltip text stay; the e2e spec reads the hidden table, so it does not change.

## Plan
- [x] `line.ts`: notes markLine without labels; `TOKENS.faint` line at width 1, dot in ink at the top; remove `labelled`/`minGap`; grid top back to 16.
- [x] `LineChart`: a `NotesStrip` under the chart, one item per note in the range: a dot, the date in the site zone, the text. Rendered only when there are notes.
- [x] Landing panel label moves under the chart in the same shape.
- [x] Design doc and docs page updated; tests updated; verify; e2e overview + notes + a11y; screenshot.

## Progress log
- 2026-09-06 — Filed from the owner's look at TICKET-076's screenshot.
- 2026-09-06 — Done: the marker is a faint dashed pin with an ink dot, no label; `NotesStrip` under the chart lists the range's notes with their date in the site zone (hour granularity adds the time); the crowding rule is gone. Landing panel matches. Looked at on the fixture at 90 days: three pins, one line of text under the axis.

## Handoff
- **State:** shipped and closed.
- **Blocked on:** nothing.
- **Next:** none.
- **Read first:** lib/charts/line.ts

## Verification
```
npm run verify                                        # 0 errors (18 pre-existing warnings), typecheck clean, 87 tickets, 235 unit tests passed
cd ../lynq-docs && npm run build                      # built
TEST_DATABASE_URL=… npx playwright test --project=app:setup --project=app \
  tests/e2e/app/{notes,overview,a11y,landing,goals}.spec.ts   # 39 passed
```
No query, migration or tracker change, so the integration suite was not rerun. Looked at: scratchpad `notes-live-1280.png` after the change.

## Outcome
Shipped: note text off the plot (`lib/charts/line.ts`), the notes strip under `LineChart` (`components/charts/charts.tsx`), the landing panel in the same shape, the design doc and the docs page corrected. Left out: nothing. Follow-ups: none.
