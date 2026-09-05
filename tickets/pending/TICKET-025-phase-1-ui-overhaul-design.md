# TICKET-025: Phase 1 design: the app shell and overview

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
A reviewed design for the UI overhaul (roadmap Phase 1) in the direction chosen in D-008: light-only tokens, top-navigation shell with site switcher, range picker, compare and URL-synced filters, the Overview / Pages / Sources / Locations / Devices / Realtime / Performance screens, and onboarding.

## Context
- Roadmap artifact (UI overhaul section and Phase 1); D-001; the query layer's actual surface in
  lib/query after TICKET-023.
- **Visual direction is decided: D-008.** Owner-approved mockup of the Overview, with the other
  directions kept for reference: https://claude.ai/code/artifact/25f864fe-6a61-480a-965e-c3404eb7657f
  (tab "Ledger + Studio", accent Teal). Source file for that page is not in the repo; the design
  doc carries the tokens. Tokens: canvas #ffffff, ink #0a0a0a, ink-2 #4a4a52, mute #8a8a93,
  rule #e8e8ec, rule-strong #111111, soft #f5f5f7, accent teal #0f766e / ink #0b5f59 / soft
  #e3f1ef, good #0f7b3e / #e1f3e8, warn #a36a00 / #fbefd2, poor #c7261f / #fbe4e2, compare line
  dotted grey; type Geist 400/500/600 (Google Fonts), tabular numerals; radii 4-6px, no shadows.
  Layout: top nav (Overview, Realtime, Pages, Sources, Locations, Devices, Events, Goals,
  Performance; Settings and site switcher on the right), title with live count and range
  subtitle, controls right-aligned (range, compare, filter chips as grey rectangles, + Filter,
  dark Share button), KPI strip of five with rule separators and delta badges, chart 2/3 with a
  right column (goal card with funnel, devices split), three tables with segmented captions
  (Top/Entry/Exit etc.), Web Vitals strip with status pills.
- Owner's taste, from the review: minimalist, "tasteful", no purple, personality through badges,
  flags and small visualisations rather than colour or cards. The roadmap's sidebar shell and
  choropleth are superseded by D-008's top nav; the globe is retired.
- Light only; no theme toggle (D-008).
- Same method as Phase 0: written design, Opus reviews, revisions, owner sign-off, then
  implementation tickets. Charting library decision (ECharts vs alternatives) is an expensive-
  to-reverse choice and gets a D-NNN.
- Depends on TICKET-023 and TICKET-024.
- Load time to design for (measured in TICKET-023 on the 12-month range against production):
  getDashboard() fans out ~16 queries, ~1.5 s of database time with four pooled connections
  and ~2.5 s end to end for a range change. The new data loading (per-card fetching, caching,
  fewer round trips) is part of this design, not a separate ticket.

## Plan
- [ ] Mock the remaining screens in the D-008 style on the same artifact page (Realtime, Pages,
      Sources, Locations, Devices, Events, Goals, Performance, Settings, onboarding) and get the
      owner's reaction before writing.
- [ ] Write docs/design/phase-1-ui-overhaul.md: tokens, component inventory, screen specs,
      URL state, data loading, empty and loading states, responsive behaviour.
- [ ] Review passes (design, information architecture, accessibility, implementation).
- [ ] Owner sign-off; decisions recorded; implementation tickets opened.

## Progress log
- 2026-09-05 — Created (D-007, Phase 1 opening).
- 2026-09-05 — Visual direction chosen by the owner after four mocked directions: D-008. Plan now
  starts with mocking the remaining screens in that style.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** what is built and working right now, what is half-done
- **Blocked on:** nothing | what
- **Next:** the next one to three concrete actions
- **Read first:** files to open before touching anything

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
