# TICKET-079: A command menu, ⌘K

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
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
- Out: search over data (pages, sources) inside the menu; that is a later addition once the
  breakdown suggestions endpoint the filter builder uses is generalised.
- Landing and docs (CLAUDE.md rule 8): product/filters.mdx gains a "Command menu" section
  under Keyboard; the landing's Filters panel can show the menu open over the Overview in a
  later pass if it earns the space.

## Plan
- [ ] Mock at 1280 and 375 over the Overview; approve the look.
- [ ] `components/shell/command-menu.tsx`: dialog, combobox, groups, fuzzy match, recents in localStorage (try/catch), the ⌘K button in top-nav.tsx, the key in useShortcuts.
- [ ] Commands wired to `update`, the router, the filter builder, the KPI action, the CSV export and copy-link; announcements.
- [ ] Unit tests (matching, keyboard model) and an e2e spec (open, navigate, filter, close returns focus, axe clean at both widths).
- [ ] Docs: product/filters.mdx "Command menu"; the shortcut sheet row.
- [ ] Verify: npm run verify; TEST_DATABASE_URL=… npm run test:e2e.

## Progress log
- 2026-09-06 — Created; the owner asked for a Linear-like command menu.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** nothing
- **Next:** the mock
- **Read first:** components/shell/shortcuts.tsx, components/shell/filter-builder.tsx, components/shell/view-state.tsx

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
