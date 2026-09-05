# Lynq

Privacy-first web analytics. Next.js 16 app with Supabase for auth and storage, the tracker in
`packages/tracker` (served from `/js/lynq.js`), and one ingest route at `app/api/collect/route.ts`.

## Start here

1. `ls tickets/in_progress` — an open ticket's Handoff section is the current state of the project.
2. Read `tickets/DECISIONS.md` for choices already made. Do not reopen them without a new decision.
3. Inspect the filesystem before trusting anything written in a ticket or in chat.

## Task tickets

All work is tracked as markdown tickets in `tickets/`. One file per task. This is the source of
truth for what is being worked on and why, so it must always match reality.

### Layout

- `tickets/_template.md` — copy this to start a ticket. Do not edit the template itself.
- `tickets/pending/` — written but not started. Status `pending` or `blocked`.
- `tickets/in_progress/` — being worked on. Status `in-progress` or `blocked`.
- `tickets/done/` — finished. Status `done`.
- `tickets/DECISIONS.md` — append-only record of expensive-to-reverse choices, `D-NNN`.

A ticket moves between directories as its status changes. Numbering is sequential across all three
directories; take the highest existing `TICKET-NNN` and add one. Never reuse a number.

### Rules

1. **Every task gets a ticket before any code changes.** Use the `ticket` skill (`new`, `start`,
   `handoff`, `close`). Small tasks still get a ticket; keep it short.
2. **Plan before any code changes.** A ticket is started only once its Plan is complete: every
   file it will touch has been read and is listed in Context, the steps are concrete, the
   verification command is named, and anything ruled out is written down. If the scope is unclear,
   resolve it in the ticket first, not in the editor.
3. **Starting a ticket: bring it fully up to date.** Move it to `in_progress/`, set the started
   date, and add to Context anything now known that was not written down. Someone with no chat
   history must be able to pick the ticket up from the file alone.
3. **The Handoff section of an in-progress ticket is the project handoff.** There is no separate
   handoff file. Overwrite it, do not append to it, whenever a turn that touched code ends with the
   ticket still open. It answers: what is built, what is blocked, what is next, what to read first.
4. **While working, keep the Progress log current.** Add a dated entry whenever the plan changes,
   a decision is made, a blocker appears, or a chunk of work lands. Tick plan items as they finish.
5. **Closing a ticket: verification is evidence, not a claim.** Verification names the command that
   was actually run and its result. Outcome says what shipped, what was left out, and which
   follow-up tickets were created. Then set `done`, move to `done/`, and run `npm run verify`.
   A ticket that touches `lib/ingest`, `lib/query`, `lib/db.ts`, `supabase/migrations` or
   `packages/tracker` also runs `npm run test:integration` (and `npm run test:e2e` once it
   exists) and records the result. A ticket is not closed until the file has moved and the
   named checks pass.
6. **Commit when a ticket closes, before the next one starts.** One ticket, one commit (or a
   few, each naming `TICKET-NNN` in the subject). Never begin a ticket with uncommitted changes
   from another. The commit includes the moved ticket file.
7. **Follow-up work found mid-ticket becomes a new ticket in `pending/`,** not an expansion of the
   current one. Link the two in each other's Context.
8. **Expensive-to-reverse choices go in `tickets/DECISIONS.md`** via the `decide` skill, and the
   ticket cites the `D-NNN`. Routine choices stay in the progress log.
9. **Ticket state must match reality at the end of every turn that touched code.**

`npm run check:tickets` enforces the structure: filenames, status per directory, dates, required
sections, Handoff on in-progress tickets, Verification and Outcome on done tickets, decision ids.

## Engineering rules

- Run `npm run verify` (lint, typecheck, ticket check, unit tests) before committing, not after.
  It needs neither Docker nor a browser. `npm run test:integration` needs `TEST_DATABASE_URL`
  pointing at a Supabase Postgres image; locally:
  `docker run -d --name lynq-test-db -e POSTGRES_PASSWORD=postgres -p 54329:5432 public.ecr.aws/supabase/postgres:15.8.1.111`
  then `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:integration`.
- Filesystem and test evidence over claims in prose. If a ticket says something is implemented,
  the path it cites must exist.
- Never commit secrets. `.env` is ignored; keep it that way.
- Unreachable code is deleted, not carried. Git is the archive.
- Keep changes focused. Preserve unrelated work in a dirty tree.
- Unit tests live next to the code as `*.test.ts`; integration tests as `*.integration.test.ts`
  under `tests/`. Add tests with the code they cover.

## Subagents

- **Only ever spawn `opus` agents. Never `fable`.** Pass `model: "opus"` explicitly on every
  Agent call; never rely on the default.
- **A subagent may never spawn its own subagents.** Every brief must say so explicitly, in these
  words: "Do not spawn subagents or use the Agent tool; do this work yourself."
- One agent at a time. Prefer doing moderate work inline where each step is visible.

## Project references

- Review and revamp roadmap: https://claude.ai/code/artifact/7b3f2d2c-4229-4642-b71e-6d94b75a7563
- Order of work is `D-001`: quality and data layer first, then the UI overhaul, then new features.
- Phase 0 (the data foundation, `docs/design/phase-0-data-foundation.md`) is complete as of
  2026-09-05: `analytics.events` is the store, `/api/collect` and `/js/lynq.js` are live, the
  dashboard still reads the old tables until Phase 1 rewires it to `lib/query`.
