# TICKET-084: Deploys are manual, not on push

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** infra

## Goal
Pushing to `main` no longer builds or releases anything. A deploy happens when the owner asks for one, so pushing work in progress is safe and a push stops being mistaken for a release.

## Context
- Owner, 2026-09-06: turn off Vercel's deploy-on-push and record that deploys are manual, that a
  push does not mean a change is live, and that work should be batched rather than pushed one
  change at a time.
- There was no `vercel.json` in the repository, so this creates one rather than merging into it.
  `git.deploymentEnabled: false` blocks only Git-triggered deploys; `vercel --prod`, deploy hooks
  and Redeploy in the dashboard are unaffected. `{ "main": false }` would scope it to one branch,
  which is not what was asked for.
- Vercel reads the setting from the pushed commit, so the push that adds this file is the last
  one that triggers a build.
- Scope: this repository and `lynq-docs`, which is a separate Vercel project and got the same
  `vercel.json`, with the practice recorded in its README because it has no CLAUDE.md (commit
  ed970b4, also held unpushed). `Clair` is not deployed from this tree at all.
- Recorded in CLAUDE.md under a new "Deploys" section, including that a ticket's Verification
  says "pushed" rather than "deployed" unless a deploy was actually run.

## Plan
- [x] Add `vercel.json` with `git.deploymentEnabled: false`.
- [x] Record the practice in CLAUDE.md: manual deploys, a push is not a release, batch the pushes.
- [x] The same `vercel.json` and note in `lynq-docs`.
- [x] Verify: npm run verify. Commit; do not push until the owner says so.

## Progress log
- 2026-09-06 — Done in one change.
- 2026-09-06 — The owner extended it to the docs repository, so `lynq-docs` got the same file and a README section replacing its "Deploys on Vercel from `main`" line.

## Handoff
Closed.

## Verification
```
npm run verify   # lint, typecheck, ticket check, 158 unit tests: pass
```
Committed and deliberately not pushed: the owner asked to hold the push.

## Outcome
Shipped: `vercel.json` and the CLAUDE.md "Deploys" section here, and the same `vercel.json` plus
a README section in `lynq-docs` (ed970b4). Both commits are held unpushed at the owner's
request. Left out: nothing. No follow-ups.
