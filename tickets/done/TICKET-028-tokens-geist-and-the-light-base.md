# TICKET-028: Tokens, Geist and the light base

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
The light D-008 token set exists as CSS custom properties and Tailwind theme entries, Geist is loaded, the main app renders on a white canvas, and reduced motion is honoured, without touching the landing or auth pages.

## Context
- Design §3 (tokens with measured contrast ratios), §1 (landing and auth pages stay as they are), D-008.
- Files: app/globals.css (current HSL shadcn variables), tailwind.config.ts (darkMode class, colors, plugins), app/layout.tsx (Satoshi and CalSans via localFont, body class bg-black text-white), app/(main)/layout.tsx (create if absent; body colours move here as bg-canvas text-ink).
- Keep tailwindcss-animate and the local fonts for now: the old dashboard's shadcn components and the landing page still use them; they go with TICKET-035 (Overview) and the landing redesign respectively. The design's "removed" wording for the fonts applies once the landing page is redesigned.
- Ruled out: a dark variant of any token (D-008).
- Read on start: app/globals.css holds the shadcn HSL variables (a `.dark` block that nothing
  toggles) plus landing-page gradients; tailwind.config.ts maps them and registers
  tailwindcss-animate; app/layout.tsx loads Satoshi and CalSans with next/font/local and sets
  `bg-black text-white`; app/(main)/layout.tsx wraps the dark Header and a max-width div;
  app/fonts/GeistVF.woff (variable, 100-900) already exists from create-next-app.
- Decision (routine): Geist is loaded from the local variable font, not Google Fonts; same
  face, no network dependency, and the design's intent (Geist 400/500/600) is met.
- Decision (routine): no production visual change in this ticket. Applying `bg-canvas
  text-ink` to app/(main) now would put the old dark components on a white page until
  TICKET-035 replaces them. The tokens, font variable, Tailwind mapping and reduced-motion
  block land; the light base is applied by the new shell's layout in TICKET-035. A
  development-only route app/(dev)/tokens renders the swatches and type scale for review
  (TICKET-031 adds the component preview beside it). The existing HSL variables stay until
  TICKET-035 deletes the components that use them.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] Add the §3 tokens to :root in app/globals.css and map them in tailwind.config.ts under new names (canvas, soft, soft-2, ink, ink-2, mute, faint, rule, rule-strong, accent, accent-ink, accent-soft, accent-bar, accent-2, accent-3, good, warn, poor and their soft variants, compare) beside the existing shadcn keys; a `tabular` utility; the radius scale.
- [x] Load Geist from app/fonts/GeistVF.woff with next/font/local as `--font-geist` on the root body (no visual change: body font stays Satoshi until TICKET-035) and map `font-sans` to it in Tailwind.
- [x] Global prefers-reduced-motion block zeroing transitions and animations.
- [x] app/(dev)/tokens/page.tsx: swatches with names and hex, the type scale, badge and pill samples; notFound() outside development.
- [x] Verify: npm run verify; npm run build; a local dev-server screenshot of /tokens and of /login (unchanged).

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; Context and Plan brought up to date (local Geist, no production visual change).
- 2026-09-05 — Tokens, Tailwind mapping, Geist variable, reduced-motion block and the dev tokens page
  landed. Two things found on the way: the design's `--accent*` names collide with the shadcn
  `--accent` HSL triple still in globals.css (the teal swatch rendered white), so the code
  names are `--teal*` / Tailwind `teal-*` until TICKET-035 removes the old variables; the
  design §3 carries a note. And `next dev` appended its own block to CLAUDE.md, which is ours:
  reverted and `agentRules: false` set in next.config.mjs. Reduced motion uses a `:root *`
  selector instead of `!important` (Biome's noImportantStyles).

## Handoff
Closed; next is TICKET-029 (URL state).

## Verification
```
npm run verify        # lint 0 errors (42 warnings, unchanged), typecheck, tickets, 84 unit tests pass
npm run build         # compiles; /tokens present (notFound() in production)
next dev -p 3005 + Playwright:
  /login   background rgb(0,0,0), font Satoshi          (unchanged, as required)
  /tokens  font Geist; every swatch renders its hex, including --teal after the rename;
           type scale, badges, pills, chip, buttons as designed  (screenshot reviewed)
CLAUDE.md unchanged after next dev with agentRules: false
```

## Outcome
Shipped: the D-008 token set as CSS custom properties and Tailwind colours (`canvas`, `soft`,
`ink`, `mute`, `faint`, `rule`, `teal`, `good`, `warn`, `poor`, `compare` families), the
`tabular` utility, the radius scale, Geist from the local variable font as `--font-geist` and
Tailwind `font-sans`, the reduced-motion block, and a development-only `/tokens` review page.
No production visual change. Left out by decision: applying the light base to `app/(main)`
(TICKET-035 does it with the new shell), removing the old fonts and HSL variables (same
ticket, and the landing redesign for the fonts). Follow-ups: none.
