# TICKET-048: Seed generates returning visitors and multi-session visitors

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** quality

## Goal
The seeded site shows sessions above unique visitors, as a real site does, so the Overview's two tiles are not the same number.

## Context
- Found on the TICKET-035 walk-through: aivia.byharsh.com shows Unique visitors 3,081 and
  Sessions 3,081 for the last 30 days, and the old dashboard showed the same equality. The
  query layer is right (visitors is count distinct visitor_id, sessions counts the sessions
  CTE); the generator in scripts/seed/generate.ts gives every visitor one session, so the two
  metrics coincide.
- Fix belongs in the generator: a share of visitors return on later days (same visitor_id,
  new session_id), and a smaller share open two sessions in a day, with the stats block
  counting sessions and visitors separately so tests/integration/seed.integration.test.ts
  can assert sessions > visitors. Re-seed aivia afterwards.

## Plan
- [ ] Returning-visitor pool in generate(): a weighted chance per day that a session belongs to a visitor from the previous 30 days.
- [ ] Stats: visitors (distinct) alongside sessions; unit test on the generator and the integration assertion.
- [ ] Re-seed aivia. Verify: npm run verify; npm run test:integration.

## Progress log
- 2026-09-05 — Created from TICKET-035.

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
