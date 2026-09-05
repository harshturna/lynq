# TICKET-021: Clear dependency vulnerabilities

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** infra

## Goal
Clear the 17 vulnerabilities GitHub reported on the default branch after the Phase 0 design push (10 high, 5 moderate, 2 low).

## Context
- Reported by GitHub on the push of commit e35409d; details at
  https://github.com/harshturna/lynq/security/dependabot.
- Most are likely transitive from packages last bumped in TICKET-001; `npm audit` locally will
  list them.
- Independent of Phase 0; can be done at any point.

## Plan
- [ ] `npm audit` and record the list here.
- [ ] `npm audit fix` for non-breaking updates; evaluate each remaining one and bump or replace the
      package.
- [ ] Verify: `npm audit` shows zero high, `npm run verify`, `npm run build`.

## Progress log
- 2026-09-05 — Created from the Phase 0 design (TICKET-011, D-004, D-005).

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
