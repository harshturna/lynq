# TICKET-051: Filter announcements carry the count and the visitor total

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
Every filter change is announced the way design §6 specifies, "Removed Country is Canada.
2 filters. 3,201 visitors.", instead of the sentence alone.

## Context
- Found while writing the Overview e2e in TICKET-047: the status region says "Added Page is
  /pricing." and stops. The nine call sites (`grep -rn "announce(\`Added" app components`)
  and components/shell/filter-chips.tsx compose the sentence themselves; none has the visitor
  total, which comes from each screen's KPI data after the transition settles.
- Design §6 (announcements), §10 (pending state). components/shell/view-state.tsx owns the
  single role="status" region and `useAnnounce()`.
- One shape: `announce` takes the sentence, and the ShellProvider appends the filter count from
  the next URL state and the visitor total from a small context the screens' KPI strips
  publish. Decide in the ticket; keep the nine call sites untouched if the provider can do it.

## Plan
- [ ] Read view-state.tsx, filter-chips.tsx, filter-builder.tsx and two row-filter call sites.
- [ ] Choose where the count and total come from; write it down here.
- [ ] Implement; unit-test the sentence composition; update the Overview e2e expectation.
- [ ] Verify: npm run verify; TEST_DATABASE_URL=… npm run test:e2e.

## Progress log
- 2026-09-05 — Created from TICKET-047.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** nothing
- **Next:** read the files in Context
- **Read first:** components/shell/view-state.tsx

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
