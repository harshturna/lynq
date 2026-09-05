# TICKET-026: Seed demo data for the guest sites

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** infra

## Goal
The guest dashboard shows a believable year of traffic again: a script generates tracker-v2-shaped rows in analytics.events for aivia.byharsh.com (and optionally lynq.byharsh.com) so every feature has data to demonstrate.

## Context
- TICKET-024 deleted the old seed data (backfill and adapter rows) per the owner's call; only
  live v2 rows remain. The old backfill script is in git history but read the old tables, so it
  cannot be reused.
- Generate rows directly (ingest_version 2, suspect false) with realistic distributions:
  sessions with several pageviews, engagement deltas, custom events with props, vitals samples,
  a spread of countries, devices, browsers, referrers and UTM sources; mark them so they can be
  wiped and regenerated (a props/name convention or a fixed visitor id range).
- Keep it out of production ingest: a script run with LYNQ_DB_POOLER_URL, idempotent (wipe then
  insert), bounded by --site and --days.

## Plan
- [ ] Decide the marker for generated rows and the distributions.
- [ ] scripts/seed-events.ts with --site, --days, --wipe, --dry-run.
- [ ] Run for aivia.byharsh.com; verify the dashboard across ranges.

## Progress log
- 2026-09-05 — Created from TICKET-024.

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
