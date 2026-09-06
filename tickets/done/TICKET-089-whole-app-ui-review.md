# TICKET-089: Whole-app UI review

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** quality

## Goal
Every screen of the app and the public pages looked at, at desktop and phone widths, on the fixture data, and every alignment, spacing, wrapping, truncation, overflow or inconsistency found is listed and fixed, so the whole product reads as one clean piece after the run of feature tickets (075–088).

## Context
- Asked by the owner on 2026-09-06 after the note-label collision in TICKET-076/087: "make sure things are looking good in UI, there's no weird UI alignment… super clean, consistent and no weird stuff going on."
- Method: the e2e app (`next dev` on :3006 with the stand-in auth and the fixture database, the owner's storage state from `test-results/.auth/owner.json`) reviewed by four parallel opus agents, review-only, each with a set of screens at 1280 and 375 (and 1000 where a layout breaks between). Findings come back as a ranked list with screenshots; the fixes are made here in one pass, with the design rules (D-008, D-010, D-011: light Ledger style, teal only, one number per row, rules not boxes) as the yardstick.
- Screens: Overview, Realtime, Pages (all views, a selected page, the session drawer), Sources, Locations (drawer), Devices, Events (selected), Goals (selected, the form), Performance, Bots, Settings (every block), the command menu, the Show-all drawer; public: landing, login, privacy, sites list, add-a-site steps.

## Plan
- [x] Start the app on the fixture; four review agents in parallel, one report each in the scratchpad.
- [x] Consolidate the reports into one ranked list here; drop false positives with a reason.
- [x] Fix, screen by screen, shared components first; re-screenshot each fixed screen.
- [x] Verify: npm run verify; npm run test:e2e (the a11y and overflow specs are the guard).

## Progress log
- 2026-09-06 — Filed and started. Four opus reviewers in parallel (reports and 200+ screenshots in scratchpad `review/`): 40 + 48 + 41 + 47 findings. Consolidated below; many were one shared cause seen from several screens.
- 2026-09-06 — **Fixed, shared components.** A global teal `:focus-visible` ring (the browser's blue showed on selects, footers, save buttons). Top nav: sections collapse to Overview + More below `lg` (they overflowed and clipped Performance and Bots between 768 and 1150 px), the More menu marks the current section, the nav link focus ring is inset. DataTable: the label column keeps a 140 px floor in fill mode (it had collapsed to 4 px on Sources at 375 and 21 px on Locations at 1000), the "Change" header is sentence case and the change column drops below 1000 px like secondary columns, the footer's separators only sit between present items (the Bots "· Export CSV"), no export for an empty table, the empty row closes the table with a rule, a non-fill table's caption rule hugs the table, rows without an expander line up with those that have one, and a table that scrolls sideways fades at its right edge. Show-all drawer: numbers right-aligned like the page table, the label header is the table's word ("Page", "Crawler"), "N of M rows" while searching, wide column sets scroll, curly quotes. KPI strip: one continuous rule under the tiles, notes never wrap, a "—" where a tile has no change so the row stays level. Range picker: stacks and fits at 375 (Apply was off-screen). Filter builder: native selects wear the app's caret. Session drawer: "1 page", header rule inset like the body's. Chart note strip: dates never wrap. Line chart: the area under a series takes the series' colour (Performance had a black line on a teal fill), note-marker dots in ink. Bar chart: threshold labels horizontal. Split bar ramp floors at 24% (the last of six segments was invisible). Segmented control: the same text-and-underline tabs as table views (it was a grey pill box).
- 2026-09-06 — **Fixed, screens.** Realtime: no dashed box for the empty state, tiles' rules at 375, "now" instead of "-0m" and the last hour's first label, a rule above Activity, copy. Overview: "The last 24 hours" instead of "Sep 6 – Sep 6", separators never open a line, the goal sentence with no sessions. Pages: the lead panel stays on Entry and Exit, "Rev. per visitor". Flow: sentence-case labels. Funnel: the drop-off sentence quotes the step; the list is labelled directly (axe "list"). Sources: goal and revenue columns are secondary below 1000 px, the drawer title no longer reads "Sources · Sources". Settings: block titles at 14 px like every section, labels on the input's line, keyboard shortcuts on the grid, the snippet wraps instead of clipping, eyebrows in sentence case, Save tracking flush left, the Notes and API keys tables in DataTable's header style inside focusable scroll regions (their sr-only "Actions" had escaped the scroll box and widened the page by 117 px at 375), the key form on the field grid, the KPI select with the app's caret, disabled primaries read disabled, the sub-nav marks the block in view, editing a note opens at its start. Goals: the form matches the note form (ink primary left, Delete beside). Performance: "0" on the axis, the device segment as tabs. Landing: the Steps column no longer clips at 375, `data-site="your-site.com"`, the hero table at 768, flex cells truncate with an ellipsis, the closing rule on the grid, the Signup tile shows its change, every staged panel starts 48 px in and bleeds off the right edge, the Journeys panel fills its frame with the timeline and Also today, the agents exchange keeps one right edge, the strip's second column at 375, chips wrap as a row, "10 screens". Docs: sidebar labels are the screens' names, "Serving the script yourself", the install page's heading order, inline code sits in the sentence, wide code blocks show a scrollbar, table headers left-aligned, the middleware regex wraps, "On this page", the same 74 hours as the landing, "Goals and the KPI".
- 2026-09-06 — **Not changed, with reasons.** Signed-out visitors are redirected to /login for unknown paths rather than a 404 (the proxy does not know the route table; a product choice, not a defect). Semantic green/amber/red on pills and Web Vitals bands stay (D-013). The KPI strip is a snapping row under 480 px by design; the fade was not added there because the cut second tile is the affordance. The loading skeletons' fidelity and the route-transition behaviour are framework-level and out of scope. The command menu keeps no pointer entry on phones (the nav is the phone's entry). Devices histogram tones, the Locations Languages width, the Countries table without a bar, the Events property block width, the matrix rule under a filled cell, the chart's last axis label, the flow's centre card and the guest account's empty sites list are recorded here as judgement calls or fixture artefacts and left.

## Handoff
- **State:** shipped and closed.
- **Blocked on:** nothing.
- **Next:** none.
- **Read first:** the Progress log above; the four reports in the session scratchpad are the evidence.

## Verification
```
npm run verify                                   # 0 errors (18 pre-existing warnings), typecheck clean, 89 tickets, 238 unit tests passed (two DataTable tests updated for "Change" and the expander spacer)
TEST_DATABASE_URL=… npm run test:e2e             # 90 passed on the final run (earlier runs caught: a scroll region without tabindex on the landing, the settings overflow, the funnel list's non-li child)
cd ../lynq-docs && npm run build                 # built
```
Looked at, after: scratchpad `review/after/` (nav at 1000, Sources and Settings and Realtime at 375, the range picker at 375, Bots, Overview at 90 days, the selected goal at 1000, Performance, the landing).

## Outcome
Shipped: the fixes listed in the Progress log across `components/shell/*`, `lib/charts/*`, the Realtime, Overview, Pages, Sources, Goals, Performance and Settings screens, the landing, and the docs. No migration, no query change. Left out: the items under "Not changed, with reasons". Follow-ups: none filed; the reports stay in the scratchpad and the judgement calls are recorded above.
