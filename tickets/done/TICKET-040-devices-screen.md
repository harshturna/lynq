# TICKET-040: Devices screen

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
/[site]/devices renders the device split, browsers with version sub-rows, operating systems, the viewport-width histogram with the site's breakpoints, and the browser-by-OS matrix.

## Context
- Design §8.6, §9.3, §9.8, §11 (viewport columns and site_settings.breakpoints). Depends on TICKET-033, TICKET-034, TICKET-035. Rows without viewport data fall back to screen width and the panel says so.
- Read on start (2026-09-05): the approved mock is the "Devices" screen in the TICKET-025
  set; built on the pattern of TICKET-037 to 039. lib/screens/devices.ts: the split from a
  device breakdown with compare; browsers and systems from single-dimension breakdowns
  (visitors, pageviews, bounce) with the top five versions per row from the two-dimension
  breakdown (browser × browser_major, os × os_version) as DataTable sub-rows; the histogram
  in 100 px bins to 2,600 px on viewport_width, falling back to screen_width when the range
  has no viewport samples and saying so in the qualifier, with the site's breakpoints as
  markers and the share per band listed under it; the matrix from browser × os over the top
  six browsers and five systems. A version sub-row's filter applies to the parent value.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] lib/screens/devices.ts; route; split bar; tables with sub-rows; histogram; matrix.
- [x] Verify: npm run verify; integration; guest walk-through.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; Context brought up to date.
- 2026-09-05 — Landed as described; no walk-through fixes needed.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed; next is TICKET-041 (Events and the session drawer).
- **Blocked on:** nothing.
- **Next:** TICKET-041.
- **Read first:** lib/screens/devices.ts.

## Verification
```
npm run verify
```
lint, typecheck, ticket check, 32 files / 150 unit tests. lib/query untouched (integration
last green on TICKET-038, 36 tests). Guest walk-through on `next dev -p 3005` at 1280 and
390 px: the split names "Desktop 61%, Mobile 33%, Tablet 6%"; Browsers and Operating systems
with one change slot on the sorted column; Expand Chrome shows versions 128, 127, 129, 126 as
sub-rows; the histogram measures the viewport ("what your CSS actually meets") with markers
at 640, 1024 and 1280 and band shares under it; the matrix shades six browsers by five
systems; no failed sections, no console errors.

## Outcome
Shipped: /[site]/devices per §8.6 with lib/screens/devices.ts, including the screen-width
fallback for ranges without viewport samples. Left out: nothing. No follow-up tickets.
