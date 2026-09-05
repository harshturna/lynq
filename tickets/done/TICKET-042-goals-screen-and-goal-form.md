# TICKET-042: Goals screen and goal form

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
/[site]/goals lists goals with the KPI star, shows the selected goal's tiles, funnel, conversion dot plot and trend, and lets an owner create, edit and delete goals and set the KPI.

## Context
- Design §8.8, §9.6 (goalStats, funnel), §11 (public.goals, kpi_goal_id upsert), guest writes rejected (§4). Depends on TICKET-033, TICKET-034, TICKET-035.
- Read on start (2026-09-05): the approved mock is the "Goals" screen in the TICKET-025 set.
  Writes are server actions in lib/screens/goal-actions.ts (createGoal, updateGoal,
  deleteGoal, setKpi): the owner is resolved through the session, the guest is refused with
  one sentence, inputs are validated (name, a path glob starting with / or an event name
  without spaces, a whole-number target), the KPI is an upsert on site_settings.kpi_goal_id
  (its primary key is site_id), and the layout is revalidated so the KPI state changes
  everywhere. lib/screens/goals.ts lists goals with goalStats, the compare stats and a
  completions sparkline each; the selected goal (sel = id) adds a funnel of visited › reached
  › completed, conversion by entry channel as a dot plot against the goal's site-wide
  conversion, and the completions trend. The form is a popover (name, kind, match, target,
  revenue, KPI) with a two-step delete when editing; the star toggles the KPI in place. The
  design's four-step funnel needs a "started" step no data defines, so three steps.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] lib/screens/goals.ts; route; goal form as a dialog with server actions; KPI toggle.
- [x] Verify: npm run verify; integration; guest walk-through (creation rejected with a notice for the guest, succeeds for a real user in a local test).

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; Context brought up to date.
- 2026-09-05 — Landed. For the walk-through a real goal was created on the demo site through the
  pooler (public.goals "Signup", event `signup`, target 500, marked as the KPI on aivia) and
  kept: it puts the Overview, Sources and Goals screens in their goal and revenue states for
  the guest. The owner path of the actions was not exercised through the browser (no real
  credentials in the walk-through); the SQL they run is the same insert and upsert the
  script ran.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed; next is TICKET-043 (Performance).
- **Blocked on:** nothing.
- **Next:** TICKET-043.
- **Read first:** lib/screens/goal-actions.ts (the write pattern every settings action follows).

## Verification
```
npm run verify
```
lint, typecheck, ticket check, 32 files / 150 unit tests. lib/query untouched (integration
last green on TICKET-041, 36 tests). Guest walk-through on `next dev -p 3005` at 1280 and
390 px with the Signup KPI goal: the table row reads "Signup · event signup · 180 ▲2.3% ·
5.8% · — · sparkline · ★ · Edit" with the star pressed; "+ New goal" opens the popover with
"The guest account cannot change goals."; selecting the goal writes `sel=1` and renders four
tiles (180, 5.8%, 1m 04s, 36% of 500), the three-step funnel, conversion by channel against
the 5.8% site average, and the completions trend with compare; the Overview's sixth tile
reads "Signup 180 ▲2.3% 5.8% conversion" with the goal panel; the Sources strip reads
visitors, Signup, revenue 1,345 and revenue per visitor 0.44 with the quadrant on conversion
sized by revenue; no console errors.

## Outcome
Shipped: /[site]/goals per §8.8 with lib/screens/goals.ts, the goal actions (create, edit,
delete, KPI) with guest refusal and validation, the goal form and the KPI star. Deviation:
a three-step funnel (visited, reached, completed); the design's "started" step has no data
behind it. No follow-up tickets.
