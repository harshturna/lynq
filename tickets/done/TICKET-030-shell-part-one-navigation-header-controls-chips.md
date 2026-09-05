# TICKET-030: Shell part one: navigation, header, controls, chips

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
The top navigation, page header, range and compare pickers, filter chips, the + Filter popover, the shortcut sheet and the page status region exist as components on the new tokens, driven by lib/url-state.ts.

## Context
- Design §6 (TopNav, PageHeader, Controls, chips, + Filter popover, shortcuts and their WCAG 2.1.4 scoping, the single role=status region), §4 (nav collapse under 640 px, scrolling row under 1000 px), §13 (touch targets, scroll-margin-top).
- Depends on TICKET-028 (tokens) and TICKET-029 (url state). Components live under components/shell/. shadcn dialog, dropdown, select, tooltip, input are restyled on the tokens here.
- RangePicker's calendar: role=grid named with month and site timezone, arrow keys, PageUp/PageDown, Home/End, aria-selected on the range, aria-current on today, the two-step announcement, ‹ › buttons as the accessible path for [ and ].
- Read on start: components/header.tsx is the old dark header (logo, avatar dropdown, sign
  out through lib/user/client); components/ui holds shadcn wrappers styled on the old HSL
  tokens and shared with the old dashboard, so they are not restyled here after all: the
  shell uses Radix primitives directly (dropdown-menu, dialog, popover) styled on the new
  tokens under components/shell/, and components/ui goes with TICKET-035. Added
  @radix-ui/react-popover for the range picker and filter builder. No component test tooling
  existed: added @testing-library/react, user-event, jest-dom and jsdom; vitest now includes
  *.test.tsx and a file opts into jsdom with a docblock, so unit tests stay in node.
- State plumbing: a `ViewStateProvider` (client) reads useSearchParams through parseSearch and
  exposes `useViewState()` = { state, update(next), pending }; `update` pushes
  pathname + toQuery(next) through useRouter inside useTransition. Announcements go through
  one `useAnnounce()` context backed by the page's role=status region, fired after the
  transition settles. The site slug, site name, timezone and the user's sites come in as props
  from the layout (wired in TICKET-035); until then the dev preview route feeds sample props.
- Dimension display names and scopes live in components/shell/dimensions.ts ("Entry channel"
  for entry_channel etc.); the entry_* names are listed now and become live with TICKET-027.
- Ruled out: window.history.pushState (nav-tabs.tsx does this today and breaks back/forward); every change goes through useRouter inside useTransition.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] TopNav with aria-current, site switcher menu, Settings, avatar menu; scrolling and More variants.
- [x] PageHeader and Controls; RangePicker with presets and the calendar; ComparePicker.
- [x] Chips (one button each, Delete/Backspace, focus after removal), + Filter popover with the combobox of suggestions, page role=status announcements after the transition settles.
- [x] Shortcut sheet (?), scoping rules, and the settings switch read from site_settings.shortcuts (column arrives in TICKET-035; default true until then).
- [x] Unit tests for the keyboard behaviour with Testing Library; verify: npm run verify.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; dependencies added; Context brought up to date (Radix primitives directly, jsdom component tests, provider shape).
- 2026-09-05 — Built components/shell: dimensions.ts (labels, scopes, display values), view-state.tsx
  (ShellProvider, useViewState, useAnnounce with the page's role=status region), control.tsx
  (Control, Segmented as a fieldset, Kbd), top-nav.tsx, page-header.tsx, ranges.ts (presets,
  labels, today in the site timezone, stepping), calendar.tsx, range-picker.tsx (RangePicker
  with ‹ › and ComparePicker), filter-chips.tsx, filter-builder.tsx, shortcuts.tsx; the dev
  preview at /shell. Tests: ranges (node), calendar, chips and shortcuts (jsdom). Deviations
  from the design's wording, all on Biome's a11y rules: the calendar is a native `<table>`
  with `aria-pressed` on selected day buttons rather than `role="grid"` with `aria-selected`
  cells (the roving tab stop and every key are as specified); groups are fieldsets with
  sr-only legends; listbox options are divs with `tabIndex=-1`. The entry_* dimensions are
  listed in dimensions.ts but not offered until TICKET-027 adds them to filters.ts.
  Walk-through on next dev as guest: chips from the URL, Delete removes with focus moving and
  "Removed Country is Canada. 3 filters." announced, range picker with presets and calendar,
  the builder's suggestions adding /pricing, URL updated through the router each time. Two
  fixes from the screenshots: the builder's select column overflowed the popover (fixed widths,
  align end); on a phone the nav showed only Overview with More out of view (only Overview
  stays inline under md, the rest under More, the site switcher truncates; then the logo text
  and gaps shrink under sm so Overview is not clipped at 390 px).

## Handoff
Closed; next is TICKET-031 (shell part two).

## Verification
```
npx vitest run components/shell    # 15 tests: ranges (today per timezone, presets, stepping, labels);
                                   # calendar (table name with timezone, today, range, future disabled,
                                   # arrows/PageUp/Home, two-step selection with announcements);
                                   # chips (names with scope, Delete pushes the URL and announces, Clear all
                                   # focuses + Filter, nothing without filters); shortcuts (scoping, disabled)
npm run verify                     # lint 0 errors (42 warnings, unchanged), typecheck, tickets, 114 unit tests pass
next dev + Playwright as guest on /shell (screenshots reviewed at 1280 and 390 px):
  chips, Delete -> /shell?…f=country%3Ais%3AUS…, status "Removed Country is 🇨🇦 Canada. 3 filters."
  range picker: presets, calendar, Apply; builder: suggestions, ArrowDown+Enter adds path:is:/pricing
  phone: Overview + More menu, controls wrap, chips wrap
```

## Outcome
Shipped: components/shell (ShellProvider and the URL-driven view state, announcements,
TopNav, PageHeader, Control and Segmented, RangePicker with calendar and ‹ ›, ComparePicker,
FilterChips, FilterBuilder with a suggestion combobox, shortcuts and the ? sheet, dimension
labels and display values), the /shell dev preview, jsdom test tooling, and
@radix-ui/react-popover. Not in production yet: nothing renders the shell until TICKET-035.
Left out by decision: restyling components/ui (goes with TICKET-035); the settings switch for
shortcuts reads a prop until TICKET-034 adds the column. Follow-ups: none new.
