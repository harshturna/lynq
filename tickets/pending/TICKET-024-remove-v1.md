# TICKET-024: Remove the v1 tracker, route, adapter and old tables

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** infra

## Goal
Retire everything v1 per D-007: the jsDelivr snippet on Lynq's site, /api/lynq, the adapter, the old-table write path, the old tables (after an export), the v1 types, and the setup dialog's v1 snippet.

## Context
- D-007. Depends on TICKET-023: the dashboard must read analytics.events first.
- Files: app/layout.tsx (v1 snippet), app/api/lynq/route.ts, lib/ingest.ts, lib/ingest/v1.ts,
  lib/ingest/v1-adapter.ts (+ test), lib/types/index.d.ts (TTrackedEvent etc.), the period-
  summary RPC and its migration, proxy.ts matcher entry for api/lynq, setup-dialog.tsx (shows
  the v1 jsDelivr snippet; switch to the v2 snippet with data-site), lib/supabase/middleware.ts
  allow-list entries for api/lynq and api/event, NEXT_PUBLIC_LYNQ_SCRIPT_VERSION env var.
- Old tables: export page_views, sessions, vitals, custom_events, visitors to CSV in the ticket's
  evidence (not committed), then drop them and their RLS policies in a migration;
  websites.visitors counter column goes too. scripts/backfill-events.ts and diff-events.ts lose
  their old-table sides or are deleted (git is the archive).
- aivia.byharsh.com still has the v1 script installed; after this ticket it needs the v2 snippet
  or stops being tracked. Owner's call, noted in the outcome.
- Landing page: the privacy copy can now say cookieless truthfully (design §2).

## Plan
- [ ] Export the old tables; record row counts.
- [ ] Remove the code paths and types; update the setup dialog and the landing copy; drop the
      proxy/middleware entries.
- [ ] Migration dropping the old tables, policies, the RPC and websites.visitors; push; refresh the
      dump; bump the test setup constant.
- [ ] Verify: npm run verify, integration, e2e, build; live check that /api/lynq is 404 and
      /api/collect still 202.

## Progress log
- 2026-09-05 — Created (D-007, Phase 1 opening).

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
