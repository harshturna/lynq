# TICKET-047: Accessibility and responsive pass, e2e per screen

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** quality

## Goal
Every screen is checked with a screen reader and at 375 px against the design's §6, §7, §12 and §13 contracts, defects are fixed, and the e2e suite gains one flow per screen.

## Context
- Design §6, §7, §12, §13; the preview route from TICKET-031; Playwright with axe-core for automated checks; VoiceOver for the manual pass. Depends on every screen ticket.
- Known from TICKET-030's walk-through at 390 px: the TopNav's More trigger is clipped by a
  few pixels and the LYNQ wordmark still showed although it is `hidden sm:inline`; check the
  row's overflow and the wordmark rule on a real device width first.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).
- **How the app runs in e2e.** The screens need a signed-in user and the `websites` table
  through PostgREST (lib/actions.ts, lib/query/authorize.ts); everything else is `lib/db`.
  The harness is a stand-in for the Supabase gateway (tests/e2e/app/supabase-stub.mjs):
  it answers the GoTrue routes supabase-js uses (password sign-in, refresh, user, sign-out)
  for two fixed users in tests/e2e/app/env.mjs (an owner, and `guest@email.com` so the
  login page's guest button works), mints HS256 JWTs, and proxies `/rest/v1/*` to a real
  PostgREST container over the test database, so row-level security is exercised for real.
  The anon key is a JWT with role `anon` signed with the same secret, as in a real project.
  Ruled out: a test-only auth bypass in the app (no product code path for tests); the
  Supabase CLI's local stack (six containers, minutes of pull time in CI, the CLI is only
  linked here for `db push`); `next start` (lib/db.ts refuses a non-pooler URL in production
  mode), so the suite runs `next dev` on port 3006 with its own `distDir` (`.next-e2e`) so it
  never shares a build directory with a developer's `next dev`.
- The test image's `auth.uid()`, `auth.role()` and `auth.jwt()` predate PostgREST 10 and read
  only `request.jwt.claim.*`; PostgREST 12 sets `request.jwt.claims`, so every RLS policy
  failed (spiked 2026-09-05). Production's definitions (read from the pooler the same day)
  coalesce both; tests/setup/database.ts installs those after the dump, next to the goals
  revoke it already re-applies.
- Fixture: one site `e2e.lynq.test` (slug `e2e-lynq-test`) owned by the owner user, its
  hostname row, a `signup` goal set as the KPI, ~40 days of `scripts/seed/generate` rows
  and a few rows dated in the last minutes for Realtime; created by a Playwright setup
  project that also signs both users in and stores their cookies.
- Local run: the Postgres container from CLAUDE.md plus
  `docker run -d --name lynq-postgrest -p 54331:3000 -e PGRST_DB_URI=postgres://postgres:postgres@host.docker.internal:54329/postgres -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET=lynq-e2e-jwt-secret-must-be-at-least-32-chars postgrest/postgrest:v12.2.12`,
  then `TEST_DATABASE_URL=... npm run test:e2e`. Without `TEST_DATABASE_URL` only the tracker
  project runs. CI's test job gains the PostgREST service.
- Screen reader: VoiceOver cannot be driven from this environment. The manual pass is
  replaced by reviewing each screen's accessibility tree (Playwright `ariaSnapshot`) against
  the §6 and §7 contracts plus keyboard tests in the e2e; the ticket says so in Outcome.
- Files this touches: playwright.config.ts, tests/e2e/app/*, tests/setup/database.ts,
  .github/workflows/verify.yml, next.config.mjs, .gitignore, package.json (adds
  @axe-core/playwright), CLAUDE.md (the local command), components/shell/top-nav.tsx, and
  whatever the passes find.

## Plan
- [x] Harness: env.mjs and supabase-stub.mjs; production's auth.* functions in
  tests/setup/database.ts; playwright.config.ts with `tracker` and `app` projects (app only
  with TEST_DATABASE_URL), the stub and `next dev -p 3006` as web servers, a setup project
  that seeds the fixture and signs both users in; `.next-e2e` distDir; CI service.
- [x] Automated axe pass (`@axe-core/playwright`) on every route at 1280 and 375 px, owner
  and guest; fix violations.
- [x] Accessibility-tree review of every screen against §6/§7 (tables, chips, drawers,
  calendar, chart descriptions and hidden tables); keyboard flows in the e2e; fix defects.
- [x] 375 px pass: screenshots of every screen, no horizontal page overflow asserted; fix
  breakages, starting with the nav's More trigger and wordmark.
- [x] One e2e flow per screen: load, filter, select, share-URL round-trip in a fresh
  context.
- [x] Verify: `npm run verify`; `TEST_DATABASE_URL=… npm run test:e2e`.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started. Spiked the harness: PostgREST v12 against the test database plus the
  auth stand-in; sign-in, role switching and RLS refusals work, owner writes failed until the
  `auth.uid()` mismatch above was found.
- 2026-09-05 — First pass (axe + overflow on 12 routes × 2 widths). Fixed: content outside
  landmarks (nav rows are now `<header>`); `--faint` on informational text (table change
  headers, empty states, the histogram legend) against design §3; h3 section titles under an
  h1 (DataTable and the Goals table now h2); empty row headers in the hidden tables (line
  buckets, histogram bands, per-minute bars get full names); scrollable regions without
  keyboard access (static KPI strip, goals table, matrix, snippet blocks); page overflow at
  375 px from grid columns growing to their content (every `grid gap-8` now has a
  `minmax(0,1fr)` base column), from the label column collapsing to zero (140 px minimum, the
  region scrolls), from the sr-only hidden table (the wrapper is hidden, not the table) and
  from sr-only spans escaping a scroll region's clip (regions are `relative`). Not
  reproduced: the More trigger clip and the wordmark from TICKET-030; the row fits at 375.
- 2026-09-05 — Accessibility-tree review: the label column header read "Value" (now the
  table's title); KPI radios read "2,091 , Unique visitors" (now "Unique visitors: 2,091");
  the row Filter button used the row id ("Filter by CA", now the label).
- 2026-09-05 — Writing the flows found product defects: a site added through onboarding never
  got an analytics.site_hostnames row, so ingest rejected every batch as unregistered
  (lib/actions.ts addWebsite now registers it; production had no trigger either);
  containsInvalidCharacters refused hostnames with a hyphen; the onboarding turned the slug
  back into a hostname lossily (the page now resolves the site and passes its url); the Pages
  treemap crashed in the browser when ECharts formatted the root node; removing the last
  chip lost focus because the server re-render replaces the header (the shell now takes a
  `focus` id in `update()` and focuses it once the transition settles).
- 2026-09-05 — Filter announcements stop at the sentence; the design's count and visitor
  total are TICKET-051.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed. Phase 1 is complete; TICKET-048, 049 and 051 are the open follow-ups.
- **Blocked on:** nothing.
- **Next:** TICKET-051 or the Phase 2 planning per D-001.
- **Read first:** tests/e2e/app/README-less: playwright.config.ts and tests/e2e/app/setup.ts.

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:integration
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:e2e
```
verify: lint, typecheck, ticket check, 32 files / 150 unit tests. Integration: 6 files / 37
tests. e2e: 57 passed in 2.2 min (13 tracker; app: 3 setup, 26 axe-and-overflow checks over
12 routes at 1280 and 375 px plus 2 as guest, and one flow per screen: overview, sites,
pages, sources, locations, devices, events, goals, performance, realtime, settings,
onboarding). The onboarding flow adds a site, posts a tracker batch to /api/collect, sees
step 2 accept it, picks a KPI and lands on the new Overview. Locally the PostgREST
container from CLAUDE.md was running next to the Postgres one; CI gains the same service.

## Outcome
Shipped: the app e2e harness (auth stand-in, PostgREST, fixture, setup project, CI service),
axe clean and no sideways scroll on every route at both widths, the fixes listed in the
progress log, and one e2e flow per screen. Left out: the VoiceOver pass itself (replaced by
the accessibility-tree review and the keyboard flows; a real screen-reader session is still
worth an hour on a Mac); the design's full filter announcement (TICKET-051); the
slug scheme's own ambiguity (a.b.c and a-b.c share a slug; pre-existing, not touched).
Follow-ups: TICKET-051.
