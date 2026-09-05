# TICKET-001: Upgrade toolchain to Next 16, React 19, Biome

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** infra

## Goal
Bring the framework and tooling to current versions before any production work starts, so every
later ticket is written against the final APIs and the repo is fast to work in.

## Context
- Installed vs latest at start: next 14.2.16 → 16.3.4, react 18.3.1 → 19.2.8, eslint 8.57 (EOL)
  → removed, typescript 5.6.3 → 7.0.2 (try; fall back to 5.x if Next's plugin or build objects),
  @supabase/ssr 0.5.1 → 0.12.x.
- Deliberately NOT upgraded: tailwindcss 3 → 4 (globals.css gets rewritten in the UI overhaul, so
  migrate once there), recharts (replaced by ECharts per the roadmap).
- Next 16 removed `next lint`, so the linter has to change anyway. Choice: Biome 2 for format and
  lint in one config. oxlint was considered and rejected because it still needs a separate
  formatter and nothing here needs ESLint plugin compatibility.
- Known Next 16 / React 19 touch points in this repo: `headers()` in `app/api/lynq/route.ts` and
  `params` in `app/(main)/[website_slug]/page.tsx` become async; `useFormState` in the two auth
  pages becomes `useActionState`; `middleware.ts` is renamed to `proxy.ts`; Radix and other packages
  need React 19 peer bumps.
- `.env` is present locally and ignored. Build must not need new env vars.
- Roadmap order is `D-001`. This ticket precedes the quick-fix tickets because the forwarded-IP fix
  edits the same route handler whose `headers()` call changes shape here.

## Plan
- [x] Upgrade next, react, react-dom, types, @supabase/ssr, @supabase/supabase-js, peer deps
- [x] Apply Next 16 / React 19 code changes (async headers/params, useActionState, proxy.ts)
- [x] Replace ESLint with Biome; add biome.json; wire `npm run lint` and `format`
- [x] Try TypeScript 7; keep it if `tsc --noEmit` and `next build` pass
- [x] `npm run verify` and `npm run build` green
- [x] Update CI workflow if commands changed

## Progress log
- 2026-09-05 — Ticket created and started. Baseline: `npm run verify` green on the old stack
  (lint warnings only).
- 2026-09-05 — Upgraded next 16.3.4, react 19.2.8, @supabase/ssr 0.12, @supabase/supabase-js,
  all Radix packages, lucide, framer-motion, react-hook-form, recharts 2.x latest (React 19 peer
  only, still v2). Removed eslint + eslint-config-next + .eslintrc.json. Added Biome 2.5.12 and
  TypeScript 7.0.2.
- 2026-09-05 — Code changes for Next 16 / React 19: `await headers()` in the ingest route, async
  `params` in the site page, `useActionState` in login and sign-up, `middleware.ts` → `proxy.ts`
  with the export renamed. `next build` rewrote tsconfig (jsx react-jsx, target ES2017, dev types
  include); kept.
- 2026-09-05 — Biome: formatted 61 files, fixed button types, ambiguous anchor text, forEach
  callbacks in the Supabase cookie adapters, `==`, useless fragments, a non-standard CSS property.
  Downgraded to warn rather than fix now, because the code is shadcn-generated or landing-page
  code the UI overhaul replaces: useExhaustiveDependencies, useKeyWithClickEvents, noArrayIndexKey.
  44 warnings remain, none blocking.

## Handoff
Closed. See Outcome.

## Verification
```
npm run verify        # biome check: 0 errors, 44 warnings; tsc --noEmit (TS 7.0.2): clean; ticket check: pass
npm run build         # Next 16.3.4, Turbopack: compiled, 8 pages generated, "ƒ Proxy (Middleware)" detected, exit 0
npx next start -p 3111 && curl
  GET /            200
  GET /login       200
  GET /sign-up     200
  GET /dashboard   307 -> /login   (proxy auth redirect working)
  POST /api/lynq {} 400            (ingest still rejects an unknown origin)
```
Not tested: logged-in dashboard rendering and guest login, which need Supabase credentials and
a browser session. The pages compiled and typecheck under React 19, and their only API change
was `useActionState`.

## Outcome
Shipped: Next 16.3.4, React 19.2.8, TypeScript 7.0.2, Biome 2.5.12 replacing ESLint, Supabase
libraries current, all React 19 peer dependencies bumped. `npm run verify` = lint + typecheck +
ticket check; `npm run format` applies Biome fixes. CI workflow runs verify on push and PR.

Left out on purpose: Tailwind 4 (migrate when the UI overhaul rewrites globals.css), Recharts 3
(replaced by ECharts in the roadmap), the 44 Biome warnings (in files the roadmap rewrites; no
ticket created, they are visible on every `npm run lint`).

Follow-up tickets: none. Next work is the quick-fix tickets from the review, starting with the
ownership check on read actions and the forwarded-IP fix.
