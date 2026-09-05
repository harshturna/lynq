# TICKET-030: Shell part one: navigation, header, controls, chips

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
The top navigation, page header, range and compare pickers, filter chips, the + Filter popover, the shortcut sheet and the page status region exist as components on the new tokens, driven by lib/url-state.ts.

## Context
- Design §6 (TopNav, PageHeader, Controls, chips, + Filter popover, shortcuts and their WCAG 2.1.4 scoping, the single role=status region), §4 (nav collapse under 640 px, scrolling row under 1000 px), §13 (touch targets, scroll-margin-top).
- Depends on TICKET-028 (tokens) and TICKET-029 (url state). Components live under components/shell/. shadcn dialog, dropdown, select, tooltip, input are restyled on the tokens here.
- RangePicker's calendar: role=grid named with month and site timezone, arrow keys, PageUp/PageDown, Home/End, aria-selected on the range, aria-current on today, the two-step announcement, ‹ › buttons as the accessible path for [ and ].
- Ruled out: window.history.pushState (nav-tabs.tsx does this today and breaks back/forward); every change goes through useRouter inside useTransition.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] TopNav with aria-current, site switcher menu, Settings, avatar menu; scrolling and More variants.
- [ ] PageHeader and Controls; RangePicker with presets and the calendar; ComparePicker.
- [ ] Chips (one button each, Delete/Backspace, focus after removal), + Filter popover with the combobox of suggestions, page role=status announcements after the transition settles.
- [ ] Shortcut sheet (?), scoping rules, and the settings switch read from site_settings.shortcuts (column arrives in TICKET-035; default true until then).
- [ ] Unit tests for the keyboard behaviour with Testing Library; verify: npm run verify.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).

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
