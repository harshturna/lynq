# TICKET-077: New vs returning visitors, decision first

**Status:** blocked
**Created:** 2026-09-06
**Started:** —
**Completed:** —
**Area:** feature

## Goal
Decide whether Lynq offers a new-versus-returning split at all, and on what identity, before any tile or chart is built for it.

## Context
- From the DataFast review; the roadmap marked it "pending a decision". D-003 makes the
  anonymous visitor id rotate daily, so across days a returning person is a new number by
  design, and the privacy page promises exactly that ("cannot recognise them across days").
  Within a day the split is computable already (a second session on the same id).
- Options to weigh with the decide skill: (a) within-day only, labelled honestly ("returned
  today"); (b) identified users only, where the id is stable, as an opt-in for logged-in
  products; (c) an opt-in first-party identifier the site turns on knowingly, which changes
  the privacy page and the consent story and was the reason D-003 exists; (d) not offered.
  The owner's instinct on 5 Sep was that anything weakening the cookieless claim is out.
- Nothing to build until the decision is recorded as a D-NNN.

## Plan
- [ ] Write the options up in DECISIONS.md via the decide skill; the owner picks.
- [ ] If (a) or (b): a tile on the Overview or Sources with the honest label; tests.

## Progress log
- 2026-09-06 — Created from the DataFast follow-up review; blocked on the decision.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** the owner's decision (D-NNN)
- **Next:** —
- **Read first:** tickets/DECISIONS.md D-003, app/(landing)/privacy/page.tsx

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
