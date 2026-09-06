# TICKET-073: Revenue per visitor on the Pages and Locations tables

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** feature

## Goal
When a site records revenue, the Pages and Locations tables show revenue and revenue per visitor beside their visitor counts, as Sources already does, so "which page and which country make money" is answerable without a goal.

## Context
- From the DataFast review ("revenue per visitor on every breakdown"). Done for Sources
  (lib/screens/sources.ts adds `revenue` when kpi.hasRevenue; the strip has a revenue-per-
  visitor tile). Not done for Pages (lib/screens/pages.ts VIEWS, app/(main)/[website_slug]/
  pages/_pages/table.tsx columnsFor) or Locations (lib/screens/locations.ts, locations/_locations/
  tables.tsx columnsFor). The query layer already returns `revenue` and `payments` per row
  through breakdownMulti, on the rollup path too (TICKET-049 second migration), so this is
  screen and column work only.
- D-013 caps tables at four visible columns; revenue per visitor replaces a column when the
  site has revenue rather than adding a fifth (decide which in the ticket: on Pages likely
  engaged time, on Locations bounce rate). Revenue per visitor is revenue / visitors on the row,
  formatted with fmtRevenue; the audit in TICKET-055 is the reference for what a clean table
  carries.
- Small and self-contained; the owner asked for it to be queued as ready to start.
- Files read on start: lib/screens/pages.ts (the static `VIEWS` map), lib/screens/locations.ts
  (`metrics`, already conditional on the KPI goal), the two tables in
  `app/(main)/[website_slug]/{pages,locations}/_{pages,locations}/`, sources/_sources/tables.tsx
  (which already has the pattern: `columnsFor` is the full set for the drawer and the CSV,
  `shownFor` is the compact set the table renders), components/shell/data-table.tsx (the `Column`
  type, and `format(value, row)` which can compute a cell from another cell as the Locations
  share column does), lib/format.ts (`fmtRevenue`).
- **Measured on production before choosing columns (2026-09-06), and it changed the plan.**
  Revenue attaches to the pageview whose custom event carried it, so on the all-pages view the
  seeded site has all 544 of its revenue on `/signup` and zero everywhere else. A revenue column
  there would be a column of zeros with one spike, and it would answer "where did the purchase
  event fire", not "which page led to money". The same argument applies to the exit view, since a
  converting session's last page is the same checkout page. Entry pages do distribute, because
  `entry_path` is session-scoped and the row metric then sums over the whole session: `/` 125,
  `/pricing` 98, `/docs/getting-started` 98, `/login` 19. Countries distribute too: US 321,
  IN 68, FR 49, CA 38.
- So: revenue goes on the Pages **entry** view and on Locations, not on the all-pages or exit
  views. "Which page led to revenue" for a mid-funnel page is the influence metric in TICKET-080,
  which is the right home for it; this ticket does not fake it with a row metric.
- Columns chosen from a mock of four variants with those real numbers (D-010, the mock is
  `scratchpad/revenue-columns.html`). Revenue alone cannot be compared across rows (`/` earns 125
  from 1,193 visitors, `/docs/getting-started` 98 from 252), so revenue per visitor earns its
  place: it ranks 0.39, 0.25, 0.10, 0.06 and inverts the raw order. Entry view with revenue shows
  Sessions, Revenue, Rev / visitor, Bounce, which keeps D-013's four-column cap; Visitors and
  Engaged move to the drawer and the CSV. Countries show Visitors, Revenue, Rev / visitor.
- Rev / visitor is computed from the row's own cells, so it needs no query change and is not
  sortable, exactly like the existing Locations share column. Zero revenue renders as an em dash
  rather than 0.00, so an empty column does not read as a measured zero.

## Plan
- [x] Measure on production and mock the variants before choosing columns.
- [x] `lib/screens/pages.ts`: `VIEWS` becomes a function of the KPI and adds `revenue` to the entry view when the site has revenue. `lib/screens/locations.ts`: add `revenue` to `metrics` the same way.
- [x] Pages: pass the KPI to `PagesTable`; split `columnsFor` (full, for the drawer and the CSV) from `shownFor` (compact) as Sources does; add Revenue and Rev / visitor.
- [x] Locations: the same two columns on the countries table.
- [x] Verify: npm run verify; TEST_DATABASE_URL=… npm run test:e2e (pages and locations specs).
- [x] Docs: `tracking/events.mdx` and `product/goals.mdx` say revenue and revenue per visitor appear on Sources, Locations and entry pages.

## Progress log
- 2026-09-06 — Created from the DataFast follow-up review.
- 2026-09-06 — Started. Measured first, which cut the all-pages and exit views from the ticket, and mocked four column sets before choosing (see Context).
- 2026-09-06 — Pages entry view shipped as mocked: Sessions, Revenue, Rev / visitor, Bounce. On the seeded site it separates /signup at 2.87 and /docs/api at 2.01 from / at 0.37, which the raw revenue order hides.
- 2026-09-06 — Locations did not survive contact with the layout. Countries, Regions and Cities share a three-column grid, so a country's table is about 410 px wide. Adding two columns clipped the table; adding one squeezed the label until only the flag rendered and the "Country" header collided with "Visitors". Both were looked at as screenshots. Revenue and Rev / visitor therefore live in the Locations Show-all drawer and CSV only, and TICKET-083 asks whether the layout should change to make room.
- 2026-09-06 — That surfaced a bug the extra columns triggered: the drawer's table is `table-fixed` and every numeric column carries an explicit width, so a wide column set left the label column zero width and every row label vanished. Fixed in `components/shell/drawer.tsx` by giving the label column its own width and letting the table exceed the drawer and scroll, which is what the scroll container was already set up for. Confirmed by screenshot; it affects every screen's drawer, not just Locations.

## Handoff
Closed; see Verification and Outcome.

## Verification
```
npm run verify                                   # lint, typecheck, ticket check, 158 unit tests: pass
TEST_DATABASE_URL=... npm run test:e2e           # 72 passed (2.6 m)
cd ../lynq-docs && npm run build                 # compiled, 25 pages
```
Looked at, not just asserted: the Pages entry view and the Locations screen at 1280, and the
Locations drawer before and after the label fix. The mock that chose the columns is
`scratchpad/revenue-columns.html`.

## Outcome
Shipped: revenue on the Pages **entry** view (Sessions, Revenue, Rev / visitor, Bounce, with
Visitors and Engaged moving to the drawer and the CSV), revenue and revenue per visitor in the
Locations full column set, the drawer label-width fix that benefits every screen, and the docs'
revenue section saying where revenue appears and why it is not on every page view
(lynq-docs c3f2265).
Left out, with reasons recorded above: the all-pages and exit views, where revenue answers
"where did the event fire" rather than "which page led to money" (TICKET-080's influence metric
is the right answer there), and the compact Locations countries table, which has no room.
Follow-up: TICKET-083, whether the Locations layout should change to make room.
