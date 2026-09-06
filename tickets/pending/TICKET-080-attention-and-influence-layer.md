# TICKET-080: Attention and influence, a layer over the numbers Lynq already has

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
**Area:** feature

## Goal
Without changing what Lynq counts today, add a second reading of the same rows that says what pageviews cannot: how much attention each page gets, whether people read it, and which pages help visitors reach the KPI. Pitch: Lynq measures attention and outcomes, not hits.

## Context
- Owner, 2026-09-06, after asking what could differentiate the analytics model: keep today's
  metrics and add this as an additional layer to make sense of the data. Everything it needs is
  already stored per pageview (design §4): `engaged_ms` (visible and focused time, §6.2),
  `scroll_depth` (max per pageview), `viewport_height`, plus goal completions per session.
  No tracker change, no new privacy trade-off, no third party.
- What exists: the Pages attention line (D-011, app/(main)/[website_slug]/pages/_pages/
  attention.ts: split of pageviews across the top pages, concentration, longest and shortest
  engaged) and the Engaged time metric (avg per session, §6.3). This ticket extends both into
  named metrics with definitions, not a new screen.
- Metric definitions to fix in the design section, then record as a D-NNN (they are the
  product's vocabulary and expensive to rename):
  - **Attention**: engaged_ms summed over the pageviews of a page in the range, shown as
    minutes; **attention share** = a page's attention / the site's. Different from Engaged time
    (an average per session): attention is a total, and it is the number that ranks pages.
  - **Read-through**: the share of a page's pageviews with scroll_depth ≥ a threshold and
    engaged_ms ≥ a floor. The threshold cannot be one number for every page and viewport;
    candidates: 75% of the document, or "past the first viewport plus 50% of the rest", with the
    floor at 10 s (the bounce floor, §6.3). Decide, and say in the docs which it is.
  - **Influence**: for each page, conversion rate of sessions that include the page vs sessions
    that do not, for the KPI goal, shown as lift ("sessions that saw /pricing converted 2.4×
    more often"). Needs a minimum session count before it is shown (say 50 on each side) and a
    note that it is association, not cause. Computable from the sessions CTE joined to goal
    completions (lib/query/sessions.ts, lib/query/goals.ts); a per-page distinct-session count
    and a converted count, both over the range; the rollup can carry both sums per day and
    page (analytics.rollup_daily already keys by dimension and value; add `converted` for the
    KPI goal, or compute from the goal rows as TICKET-049's read path does).
- Where it shows (design first, D-010, mock and look): the Pages table gains an Attention view
  (attention, share, read-through, influence) beside Top, Entry and Exit, keeping D-013's
  four-column cap; the attention line grows to say "the top 3 pages take 61% of attention" in
  those terms; the Overview's Pages table can rank by attention when the site has enough
  engagement data. Realtime and Sources are untouched.
- Honesty in the words (the owner's "numbers you can defend" angle): each metric's definition
  is one sentence in the UI's hover and in the docs, and the docs' counting page gets the three
  definitions verbatim. Attention depends on the visibility signal, reliable on desktop and
  good on mobile; a page with fewer than N pageviews shows "—" for read-through and influence
  rather than a noisy number.
- Landing and docs (CLAUDE.md rule 8): a landing panel staged from the Attention view with the
  lead "Which pages people actually read", the hero's ranked table can rank by attention, and
  the docs home's "What you get" gains the line; docs product/counting.mdx gains the three
  definitions; a docs page on reading the Attention view.

## Plan
- [ ] Design section (docs/design, a Phase 2 or standalone doc): the three definitions, the thresholds, the minimum counts, the Attention view layout; mock at 1280 and 375.
- [ ] Decision (decide skill): the definitions and the read-through threshold, as a D-NNN.
- [ ] Query: attention and read-through per page from the rows; influence from sessions and the KPI goal; rollup columns or goal-row computation; budgets on the seed fixture.
- [ ] Seed: scroll depth and engaged time with a plausible shape per page type so the demo shows real spread.
- [ ] Pages screen: the Attention view and the extended attention line; Overview ranking option; hover definitions; announcements.
- [ ] Landing panel and docs pages; the hero table ranks by attention.
- [ ] Verify: npm run verify; npm run test:integration; npm run test:e2e; measure on production.

## Progress log
- 2026-09-06 — Created from the owner's differentiation question; keep today's metrics, add the layer.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** the design section and the definitions decision
- **Next:** write the definitions, mock the view
- **Read first:** app/(main)/[website_slug]/pages/_pages/attention.ts, lib/query/sessions.ts, docs/design/phase-1-ui-overhaul.md §8.3

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
