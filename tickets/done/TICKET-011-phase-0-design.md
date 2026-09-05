# TICKET-011: Phase 0 design, the data foundation

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** infra

## Goal
A reviewed, owner-approved design for Phase 0 of the revamp: the event store, ingest pipeline,
tracker v2, backfill, and cutover. No code in this ticket. Its output is
`docs/design/phase-0-data-foundation.md` and the follow-up tickets that implement it.

## Context
- Roadmap: https://claude.ai/code/artifact/7b3f2d2c-4229-4642-b71e-6d94b75a7563 (Target
  architecture, Tracker v2, Phase 0).
- Decisions already made: D-001 (order of work), D-002 (ClickHouse for events, Postgres for
  metadata), D-003 (cookieless identity by default, identify() opt-in). The design must not
  reopen these.
- Current state after TICKET-001..010: Next 16 app, Supabase Postgres with RLS, ingest route
  writing through a service-role client in `lib/ingest.ts`, platform geo headers, isbot filter,
  schema dump in `supabase/schema.sql`. Production has ~6k page views, ~1.7k sessions, one site.
- Tracker lives in the separate `harshturna/lynq-js` repo (source read during the review:
  localStorage client id, 10-minute session in localStorage, MutationObserver SPA detection,
  beforeunload flush, ip-api geo).
- Review process: design written, then reviewed by Opus agents (architecture and data,
  ingest/tracker/security/ops, product query coverage), revised after each, then a final
  pass. Reviewer findings and what changed are logged below.

## Plan
- [x] Write the design document.
- [x] Review 1: ClickHouse schema, sessions, identity, backfill, multi-tenancy.
- [x] Review 2: ingest path on Vercel, tracker v2, privacy, security, operations, cost.
- [x] Review 3: does the schema and query API cover every Tier 1 to 3 feature in the roadmap.
- [x] Revise after each; final confirmation pass.
- [x] Present to the owner at a high level; record decisions raised as D-NNN; open the
      implementation tickets.
- [x] Verify: `npm run verify` (ticket check) and the document exists at the cited path.

## Progress log
- 2026-09-05 — Started. Design written: docs/design/phase-0-data-foundation.md, 17 sections.
  Review 1 (data layer) launched on an opus agent.
- 2026-09-05 — Review 1 returned 17 findings (2 critical, 9 high, 6 medium). Critical: engagement
  and custom rows arrive in later batches with no page context, so "every row carries every
  dimension" was false; client `ts` fed the partition key unvalidated. High: client-controlled
  first x-forwarded-for entry feeding visitor_id; salt cached per instance across midnight;
  `event` in the sort key and `ts` last; two contradicting session definitions (NAT makes
  gap-sessionisation the wrong "truth"); bounce/duration definitions inconsistent with engagement;
  row-only filter compiler cannot express session predicates; ALTER DELETE vs lightweight DELETE
  and TTL not dropping parts; backfill without a cutoff double-counts; permanent legacy visitor
  ids break the Visitors metric at cutover; four §16 function claims wrong. All folded into
  draft v2 (Appendix A of the doc lists section by section). Kept as-is on the reviewer's
  advice: one wide table, monthly partitions, Map props, salt creation protocol, ingest_version,
  202-on-everything, lib/query as the only SQL, engagement rows, zod-generated tracker types.
  Review 2 (ingest, tracker, privacy, security, ops) launched.
- 2026-09-05 — Review 2 returned 16 findings (1 critical, 6 high, 8 medium, 1 low). Critical: the
  auth proxy's matcher covers every non-static path, so /api/collect and /js/lynq.js would 307
  anonymous requests to /login and call Supabase Auth per beacon. High: site taken from the body
  and size limits applied after parsing; parent-domain hostname matching leaks sibling tenants
  on public suffixes; no ClickHouse client timeout so a slow store holds the function to
  maxDuration; no CORS headers and an unpinned Blob content type; 60 s engagement beacon = 60
  invocations per visitor-hour; raw page titles stored for 24 months. Medium: per-batch `seq`
  collides across batches; "nothing written to the browser" false and storage access throws;
  no pageshow so bfcache back-navigations record nothing; GPC off-by-default is not legally
  defensible and the `@` check is theatre; 202 hides misconfigured installs; 3 KB budget
  unrealistic and vitals is ~4 KB; 302-to-hashed-script forbids SRI; CI plan too heavy for the
  pre-commit rule and no test catches cross-batch invariants. All folded into draft v3 (Appendix
  A). Kept on the reviewer's advice: envelope with page and session context, sort order, client
  session id definition, sessionWhere, delta engagement, wait_for_async_insert=1, backfill
  --until, ttl_only_drop_parts, bounce definition. Review 3 (consistency, implementability,
  roadmap coverage, Phase 1 reproduction) launched.

## Handoff
Closed. See Outcome.

## Verification
```
ls docs/design/phase-0-data-foundation.md   # 1088 lines, v4
npm run check:tickets                        # Ticket check passed (21 tickets)
npm run verify                               # lint 0 errors / 44 warnings, tsc clean, ticket check pass
```
Three Opus review agents ran sequentially (data layer; ingest/tracker/privacy/ops; consistency
and roadmap coverage), each on the revision produced by the previous one; their findings and the
section-by-section responses are in the document's Appendix A and in this log.

## Outcome
Shipped: `docs/design/phase-0-data-foundation.md` v4 (17 sections, three review appendices),
D-004 (design and visible cutover changes accepted), D-005 (privacy and retention defaults).

Left out: nothing from the plan. Parallel reviews were not used; each review needed the
previous revision.

Follow-up tickets: TICKET-012 ClickHouse service and migrations; TICKET-013 identity and site
registry; TICKET-014 ingest v2; TICKET-015 v1 adapter; TICKET-016 query foundations; TICKET-017
backfill; TICKET-018 tracker core; TICKET-019 tracker extras and vitals; TICKET-020 dual-run
and close-out; TICKET-021 dependency vulnerabilities (unrelated to Phase 0).
