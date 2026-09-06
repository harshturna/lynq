# TICKET-079: A command menu, ⌘K

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
One keystroke opens a Linear-style command menu from anywhere in the app: type to jump to a site or a screen, change the range or comparison, add a filter, set the KPI, copy the link, or open a setting, with arrow keys and Enter, and every action named the way the UI names it.

## Context
- The roadmap's UI principles list it ("Command palette for switching sites and views, shortcuts
  for date ranges") and the approved shell wireframe shows ⌘K in the header, but no Phase 1
  ticket built it. What exists: components/shell/shortcuts.tsx (`useShortcuts`: `?` for the
  sheet, `/` for search, `[` `]` for the range, all scoped per WCAG 2.1.4 and switchable in
  Settings › General), the shortcut sheet listing them, the site switcher and account menu in
  components/shell/top-nav.tsx (Radix dropdown), and the filter builder's combobox in
  components/shell/filter-builder.tsx (Radix popover, `aria-activedescendant` listbox), whose
  pattern the menu can reuse. View state lives in the URL (components/shell/view-state.tsx
  `update`), so every command is a call to `update` or a router push, and `useAnnounce`
  announces the result.
- Commands, grouped: Go to (each screen of the current site; each site; Sites; Settings and its
  sections); Range (each preset, custom, compare on or off, previous period or year); Filter
  (`Filter by <dimension>…` opens the builder on that dimension; `Clear filters`); Actions
  (Copy link to this view, Export this table, Set KPI, Add a site, Log out); Help (Keyboard
  shortcuts, Docs). Recent commands first; fuzzy match on label and keywords.
- Look (D-008): a 560 px panel on the ink/20 overlay like the shortcut sheet, one input with no
  icon, group eyebrows in the mute style, the selected row in teal-soft, the shortcut hint
  right-aligned in the faint colour, no shadows beyond the sheet's. Mock the panel over the
  Overview at 1280 and 375 and look before coding (D-010); on phones it is a bottom sheet.
- A11y: `role="dialog"` with the input as a combobox over a listbox, `aria-activedescendant`,
  Escape closes and returns focus, the shortcut is ⌘K / Ctrl+K (a modified key, so it is not a
  bare single-key shortcut) and a "⌘K" button in the top nav is the visible, discoverable path.
  The shortcut sheet gains the row. The shortcuts switch turns the key off, not the button.
- Files read on start: components/shell/{shortcuts,view-state,top-nav,filter-builder,range-picker,
  screen-header,ranges}.tsx, lib/url-state.ts, app/(main)/[website_slug]/layout.tsx and
  lib/screens/site.ts. The layout renders `TopNav` inside `ShellProvider` with the site and the
  site list, so the nav is the mount point: it has the data the menu needs and the view-state
  context is above it. `resolveSite` already returns the site's `shortcuts` setting, so the
  layout threads it through rather than a new query.
- Scope settled while planning. Wireable cleanly from the shell, and therefore in: Go to (the
  nine sections, Settings, All sites, each other site), Range (the nine presets), Compare (three),
  Filters (Clear all, and Remove one per active filter value), Actions (Copy link to this view),
  Help (Keyboard shortcuts, Documentation). Deferred, because they are owned by screen components
  rather than the shell and would need a second path to reach: adding a filter (the builder lives
  in ScreenHeader), Export CSV (owned by DataTable) and Set KPI (a server action on Goals).
- Changed after looking at the mock (`scratchpad/command-menu.html`, screenshotted): recents are
  excluded from the groups below them, because a list that repeats itself reads as a bug; and one
  centred panel is used at every width rather than a separate phone sheet, which looked no better
  at 375 and doubles the surface.
- `SECTIONS` moved from top-nav.tsx to a new `components/shell/sections.ts`, because the menu
  needs it and top-nav imports the menu; top-nav re-exports it so nothing else changes.
- ⌘K is bound in the menu itself rather than in `useShortcuts`, which returns early on a modified
  key by design. It is a modified shortcut, so WCAG 2.1.4 does not require it to be switchable,
  but the site's keyboard-shortcuts setting still gates it; the visible button never goes away.
- Out: search over data (pages, sources) inside the menu; that is a later addition once the
  breakdown suggestions endpoint the filter builder uses is generalised.
- Landing and docs (CLAUDE.md rule 8): product/filters.mdx gains a "Command menu" section
  under Keyboard; the landing's Filters panel can show the menu open over the Overview in a
  later pass if it earns the space.

## Plan
- [x] Mock at 1280 and 375 over the Overview; approve the look.
- [x] `components/shell/command-menu.tsx`: dialog, combobox, groups, matching, recents in localStorage (try/catch), the ⌘K button in top-nav.tsx, the key in the menu itself.
- [x] Commands wired to `update`, the router, the clipboard and the shortcut sheet; announcements.
- [x] Unit tests (matching, keyboard model) and an e2e spec (open, navigate, filter, close returns focus, axe clean at both widths).
- [x] Docs: product/filters.mdx "Command menu"; the shortcut sheet row.
- [x] Verify: npm run verify; TEST_DATABASE_URL=… npm run test:e2e.

## Progress log
- 2026-09-06 — Created; the owner asked for a Linear-like command menu.
- 2026-09-06 — Two bugs found by looking at the built menu rather than by a test, both older than this ticket. The overlay did not dim: `bg-ink/20` computes to fully transparent, because Tailwind 3 cannot apply an opacity modifier to a colour defined as a bare `var()`. Every modal in the app was affected, so the Show-all drawer and the shortcut sheet had no scrim either. Fixed with a `--scrim` token that bakes the alpha in, used by all three. The same defect made the selected goal row's `bg-teal-soft/60` invisible; it now uses `bg-teal-bar`, the lighter tint the palette already has.
- 2026-09-06 — Escape closed the menu without returning focus, because the ⌘K button is not the Radix trigger (the key opens it too). Focus is now restored by hand on close, and skipped when a command navigated.
- 2026-09-06 — Planned, mocked and built. The mock changed two things (see Context). The ticket file was moved to in_progress after the component was written rather than before, which is the wrong order under rule 3; the Context and this log were brought up to date in the same turn.

## Handoff
Closed; see Verification and Outcome.

## Verification
```
npm run verify                                   # lint, typecheck, ticket check, 165 unit tests: pass
TEST_DATABASE_URL=... npm run test:e2e           # 77 passed (2.8 m)
cd ../lynq-docs && npm run build                 # compiled, 25 pages
```
`components/shell/command-menu.test.tsx` covers the matcher, the ranking, the keyboard model
including wrap-around, the empty state, a filter's removal appearing only while the filter is on,
and recents being remembered and not repeated. `tests/e2e/app/command-menu.spec.ts` opens it with
the keyboard and with the button, navigates, changes the range through the URL, clears a filter,
checks Escape returns focus to the button, and runs axe at 1280 and 375.
Looked at, not just asserted: the menu over the Overview at both widths, before and after the
scrim fix.

## Outcome
Shipped: `components/shell/command-menu.tsx` with the five command groups, the ⌘K button in the
top nav, `components/shell/sections.ts` (moved out of top-nav so the menu can import it without a
cycle), the shortcut-sheet row, the `--scrim` token and the two opacity fixes it uncovered, unit
and e2e tests, and the docs' "Command menu" section (lynq-docs e7e5d93).
Left out, because they are owned by screen components rather than the shell and would need a
second path into the document: adding a filter (the builder lives in ScreenHeader), Export CSV
(owned by DataTable) and Set KPI (a server action on Goals). Searching data from the menu stays
out, as the ticket said. No follow-ups filed.
