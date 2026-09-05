# TICKET-004: Page load time displays milliseconds with a seconds suffix

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Area:** quality
**Completed:** 2026-09-05

## Goal
Show page load time as seconds. Today a 1.8 second load renders as "1834.00s".

## Context
- `lib/utils.ts` `calculateWebVitalScore`, case `"load"` (line 750): formats `value.toFixed(2)`
  with an `s` suffix, but `value` is milliseconds. The thresholds on the same case (3000 / 6000)
  are in milliseconds and are correct.
- Source of the value: the tracker sends `navEntry.loadEventStart` (milliseconds) in the
  session-end payload; `addVitals` stores it unchanged; `calculateAverageVital` averages without
  converting. So the number reaching the formatter is milliseconds.
- Commit 4d10a29 "update load vital units" introduced the `s` suffix without the division.
- Displayed by `CoreVitalCard type="load"` in
  `app/(main)/[website_slug]/_components/performance-dashboard.tsx` line 39.
- Ruled out: converting at the source (tracker or storage). Every other vital is stored in
  milliseconds; only the display should differ.

## Plan
- [x] Read `calculateWebVitalScore` and trace where the load value comes from.
- [x] Divide by 1000 in the `"load"` display branch only. Thresholds unchanged.
- [x] Verify: `npm run verify`, and a node one-liner through the compiled function showing
      1834 → "1.83s" Good, 4500 → "4.50s" Need improvement, 7000 → "7.00s" Poor, -1 → N/A.

## Progress log
- 2026-09-05 — Planned and started.
- 2026-09-05 — Fixed: display divides by 1000 in the load branch only.

## Handoff
Closed. See Outcome.

## Verification
```
npm run verify   # lint 0 errors / 44 warnings, tsc clean, ticket check pass
node utils-test  # calculateWebVitalScore compiled with tsc and called directly
 1834 -> 1.83s  Good
 4500 -> 4.50s  Need improvement
 7000 -> 7.00s  Poor
   -1 -> N/A    Not enough data
```

## Outcome
Shipped: one-line display fix in `lib/utils.ts`. Thresholds and storage unchanged.

Left out: nothing.

Follow-up tickets: none.
