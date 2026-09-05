# TICKET-028: Tokens, Geist and the light base

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
The light D-008 token set exists as CSS custom properties and Tailwind theme entries, Geist is loaded, the main app renders on a white canvas, and reduced motion is honoured, without touching the landing or auth pages.

## Context
- Design §3 (tokens with measured contrast ratios), §1 (landing and auth pages stay as they are), D-008.
- Files: app/globals.css (current HSL shadcn variables), tailwind.config.ts (darkMode class, colors, plugins), app/layout.tsx (Satoshi and CalSans via localFont, body class bg-black text-white), app/(main)/layout.tsx (create if absent; body colours move here as bg-canvas text-ink).
- Keep tailwindcss-animate and the local fonts for now: the old dashboard's shadcn components and the landing page still use them; they go with TICKET-035 (Overview) and the landing redesign respectively. The design's "removed" wording for the fonts applies once the landing page is redesigned.
- Ruled out: a dark variant of any token (D-008).
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] Add the §3 tokens to :root in app/globals.css and map them in tailwind.config.ts (canvas, soft, soft-2, ink, ink-2, mute, faint, rule, rule-strong, accent, accent-ink, accent-soft, accent-bar, accent-2, accent-3, good, warn, poor and their soft variants, compare); tabular-nums utility.
- [ ] Load Geist 400/500/600 from next/font/google as --font-sans for app/(main) only.
- [ ] Scope bg-canvas text-ink to app/(main)/layout.tsx; leave the root body class for the landing and auth pages.
- [ ] Global prefers-reduced-motion block zeroing transitions and animations.
- [ ] Verify: npm run verify; npm run build; screenshot of /login (unchanged) and /[site] (white canvas, Geist) on a local next start.

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
