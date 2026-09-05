# TICKET-005: Scope the visitor last-visit update to the site

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Area:** quality
**Completed:** 2026-09-05

## Goal
Stop a returning visitor on one site from bumping their last-visit time on every other site
that has seen the same client id. The dashboard's Visitors card counts visitors rows by
last_visited in range, so this inflates other sites' visitor counts.

## Context
- `lib/actions.ts` `addVisitor` (around line 170): inserts `{ client_id, website_url }` into
  `visitors`; on a unique violation (23505) it updates `last_visited` filtered by `client_id`
  only. The update needs `website_url` too.
- `getAnalytics` computes `visitors_count` as the count of visitors rows where `website_url`
  matches and `last_visited` is in range, so the wrongly bumped rows are counted.
- The unique constraint's columns are not in the repo. If it is on `(client_id, website_url)`,
  this fix is complete. If it is on `client_id` alone, a client's second site never gets a
  visitors row at all, which is a separate schema problem for the schema-export ticket to
  surface. Either way, scoping the update is correct and no worse than today.
- The read-then-write counter on `websites.visitors` in the same function is racy and is
  noted in the review, but the roadmap drops that column; not touched here.
- Ruled out: an upsert with `onConflict`, because the conflict target depends on the unknown
  constraint.

## Plan
- [x] Read `addVisitor` and the visitors count query in `getAnalytics`.
- [x] Add `.eq("website_url", website_url)` to the last_visited update.
- [x] Verify: `npm run verify`, `npm run build`. No runtime test: the change is one filter on a
      write path and there is no test database.

## Progress log
- 2026-09-05 — Planned and started.
- 2026-09-05 — Fixed: update filtered by client_id and website_url.

## Handoff
Closed. See Outcome.

## Verification
```
npm run verify
Found 44 warnings.
Ticket check passed (5 tickets).
npm run build
✓ Compiled successfully in 735ms
```

## Outcome
Shipped: the last_visited update in `addVisitor` is filtered by site.

Left out: the racy `websites.visitors` counter (column is dropped by the roadmap) and the
unique-constraint question, which the schema-export ticket will answer.

Follow-up tickets: none; the constraint check is folded into the schema-export ticket's plan.
