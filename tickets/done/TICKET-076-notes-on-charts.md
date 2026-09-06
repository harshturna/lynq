# TICKET-076: Notes on charts

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** feature

## Goal
A site owner can pin a dated note ("Launched on Product Hunt", "Deployed v2") that shows as a marker on every time chart, and a deploy pipeline can post the same note through a small API, so a change in the numbers can be read against what happened.

## Context
- From the DataFast review; Phase 3 in the roadmap ("deploy markers arrive through the same
  notes API from your own CI, no provider integration", per the owner's no-third-party rule).
  Nothing exists yet: no table, no API, no marker in lib/charts. The lead chart is ECharts
  (lib/charts/*, components/charts/charts.tsx); a marker is a markLine or a small glyph on the
  x axis with the note on hover and in the sr-only table.
- Storage: public.notes (site_id, at, text, author, created_at) with RLS like goals; a notes
  API needs the same site-key decision as TICKET-075.
- Design first (D-010): the marker's look on the light chart, the add-note control (from the
  chart or from settings), editing and deletion.
- **Designed 2026-09-06: `docs/design/notes-on-charts.md`**; marker mocked in scratchpad
  `notes-mock.html` (dashed ink hairline from the axis, a dot at the top, the text as label,
  "2 notes" when a bucket has several; the tooltip repeats the text). Editing lives under
  Settings → Notes, not in the tooltip.
- Auth for the API is settled: an API key with the `notes` scope (D-017); the key's name is
  the author. Origin refusal and the in-memory limiter as `/api/bots` (TICKET-075, TICKET-086).
- Files read for the plan: `lib/charts/line.ts` and `line.test.ts` (the option builder; a
  threshold `markLine` already exists on the last series and the notes marker joins it),
  `lib/charts/echarts.ts` (MarkLineComponent is registered; no MarkPoint needed),
  `lib/charts/format.ts` (`Point`, `bucketTitle`), `components/charts/chart.tsx`, `charts.tsx`
  (`LineChart` builds the option and the hidden table), `hidden-table.tsx`,
  `app/(main)/[website_slug]/_overview/lead.tsx` and `sections.tsx`, `lib/screens/overview.ts`
  (`SeriesData`, the `series()` promise the notes ride on), `lib/screens/goals.ts`
  (`SelectedGoal.trend`), `goals/_goals/selected.tsx` (the Completions section) and `form.tsx`
  (the popover pattern the note form copies), `lib/screens/goal-actions.ts` (owner check,
  guest refusal, validation, revalidate), `lib/screens/settings.ts` and `settings-actions.ts`
  (`listApiKeys`, `createApiKey`), `settings/_settings/settings.tsx` (`SECTIONS`, `Block`,
  the ApiKeys table), `lib/api-keys.ts` (`ResolvedKey` needs the key's name),
  `supabase/migrations/20260905050000_phase1.sql` (the goals RLS the notes table copies),
  `tests/integration/schema.integration.test.ts` (the goals lockdown assertion to extend),
  `tests/e2e/app/fixture.ts`, `scripts/seed/generate.ts` (launch spikes at 38% and 72% of the
  range, which the seeded notes label), `scripts/seed-events.ts`, `app/(landing)/_landing/panels.tsx`
  (`OverviewPanel` SVG), docs `index.mdx`, `product/settings.mdx`, `product/counting.mdx`,
  `product/api-keys.mdx`, `product/_meta.js`.

## Plan
- [x] Design section and mock: `docs/design/notes-on-charts.md`, scratchpad `notes-mock.png`.
- [x] Migration `20260906040000_notes.sql`: `public.notes` (id, site_id, at, text ≤ 140, author, created_at, updated_at), RLS and revokes as goals, index (site_id, at). Schema test asserts the lockdown.
- [x] `lib/query/notes.ts` + `run.ts` `notes(ctx)`: notes with `at` inside the range, oldest first, capped at 200.
- [x] `lib/charts/notes.ts` (pure, tested): `noteMarkers(notes, points)` folds notes to bucket indexes (the last bucket whose start ≤ at); `line.ts` draws them as a silent `markLine` on the primary series with the text (or "N notes") as label and lists them in the tooltip; `LineChart` gains a `notes` prop and a Notes column in the hidden table.
- [x] `lib/screens/note-actions.ts`: `createNote`, `updateNote`, `deleteNote` (owner, guest refusal, text 1–140, `at` a valid instant within ±10 years). `components/shell/note-form.tsx`: the Add-note popover (date-time in the site zone, text) used from the Overview lead section and the goal's Completions section; the right slot also links "N notes" to Settings → Notes.
- [x] `lib/notes/api.ts` (pure, tested) + `app/api/notes/route.ts` (POST → 201) + `app/api/notes/[id]/route.ts` (DELETE → 204): bearer key with the `notes` scope, Origin refused, limiter; author `key:<name>`, so `ResolvedKey` gains `name`.
- [x] Overview `SeriesData.notes` and Goals `SelectedGoal.trend.notes` loaded beside the series; Settings → Notes block (list with date, text, author; edit and delete) with `SettingsData.notes`.
- [x] Seed: fixture and `npm run seed` write two notes at the generator's launch spikes; the demo site gets them with the owner's word.
- [x] Tests: unit (markers, API handler, validation), integration (RLS lockdown, notes in range), e2e (add a note from the Overview, see it in the hidden table and in Settings → Notes, delete it).
- [x] Docs: `product/notes.mdx` (adding, what it marks, the API call for a pipeline, the key setup), settings.mdx Notes section, counting.mdx Web Vitals mention, api-keys.mdx scope row link, index.mdx "What you get" line, `_meta.js`.
- [x] Landing: the Overview panel's chart gains one marker with a note label.
- [x] Verify: npm run verify; npm run test:integration; npm run test:e2e; migration pushed to production.

## Progress log
- 2026-09-06 — Created from the DataFast follow-up review.
- 2026-09-06 — Designed and mocked; plan made concrete. Started.
- 2026-09-06 — Marks ride on a series' single `markLine` with per-item styles, so a threshold and notes can share one; ECharts reads the end symbols from the markLine itself, not the item, which the first live look showed as default arrows. Adjacent markers drop their label (the dot and the tooltip stay) when closer than a tenth of the axis, and a label near the right edge hangs left; both seen on the fixture before the rule existed.
- 2026-09-06 — Validation shared by the actions and the API (`lib/notes/validate.ts`): 1–140 characters, whitespace collapsed, the instant within ten years of now. `ResolvedKey` gained the key's name so a note through a key is signed `key:<name>`.
- 2026-09-06 — Editing lives in Settings → Notes, not in the tooltip (design §5). The chart's right slot shows "N notes" linking there, and "+ Add note".
- 2026-09-06 — Seed notes at the generator's launch spikes (`scripts/seed/notes.ts`); the fixture and `npm run seed` write them, the seed script replacing only its own (authors `seed` and `key:Deploy pipeline`).
- 2026-09-06 — Two e2e catches: an empty `<th>` on the actions column tripped axe (both settings tables now carry an sr-only "Actions"), and `getByLabel("Note")` also matched the "N notes" link.
- 2026-09-06 — Migration pushed to production; RLS and revokes confirmed there. No production notes written.

## Handoff
- **State:** shipped and closed.
- **Blocked on:** nothing.
- **Next:** none for this ticket.
- **Read first:** docs/design/notes-on-charts.md

## Verification
```
npm run verify                                   # lint 0 errors (18 warnings, pre-existing), typecheck clean, 86 tickets, 44 files / 235 unit tests passed
TEST_DATABASE_URL=… npm run test:integration     # 11 files / 57 tests passed (notes, schema lockdown added)
TEST_DATABASE_URL=… npm run test:e2e             # first run 82 passed, 3 failed (empty th, label collision), fixed; final full run 85 passed
npx supabase db push --linked                    # 20260906040000_notes.sql applied; rls true, 0 grants to anon/authenticated confirmed in production
cd ../lynq-docs && npm run build                 # static export built, 30 pages
```
Looked at: scratchpad `notes-mock.png` (the marker), `notes-live-1280.png` (the Overview on the fixture with three seeded notes, after the symbol and label fixes).

## Outcome
Shipped: `public.notes` (migration in production), the notes read (`lib/query/notes.ts`), markers on the Overview lead chart and a goal's completions trend (`lib/charts/notes.ts`, `line.ts`, `LineChart` `notes` prop with a Notes column in the hidden table and the count in the description), the note popover (`components/shell/note-form.tsx`) from both charts and from Settings → Notes (list, edit, delete), server actions (`lib/screens/note-actions.ts`), `POST /api/notes` and `DELETE /api/notes/:id` on a key with the notes scope (`lib/notes/api.ts`, `lib/notes/db.ts`), seeded notes in the fixture and the seed script, unit, integration and e2e tests, the landing Overview panel's marker, and docs: `product/notes.mdx` (adding, what it marks, the API with a GitHub Actions step), settings.mdx, counting.mdx, api-keys.mdx, the home "What you get" line.

Left out, on purpose: markers on Performance, Pages and Events charts (design §7); notes attached to a page or a goal; an edit history; a listing endpoint (TICKET-078 reads); provider integrations. The API's limiter is the in-memory one until TICKET-086. No notes written to the demo site in production; `npm run seed` adds the three seeded ones when the owner wants them.

Follow-ups: none new.
