# TICKET-080: Attention and influence, a layer over the numbers Lynq already has

**Status:** in-progress
**Created:** 2026-09-06
**Started:** 2026-09-06
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
- **Done on start: the design section is `docs/design/attention-and-influence.md` and the
  definitions are D-016.** Everything below was the plan before measuring; the design document is
  now the source of truth for the definitions and the layout.
- Measured on production before fixing anything (2026-09-06). `engaged_ms` and `scroll_depth` are
  **not on pageview rows**; they arrive on `engagement` events, which carry the page's `path` and
  `pageview_id`. Every one of the 8,735 engagement rows in the last 30 days has both. So attention
  and read-through are a grouped scan of engagement rows, not of pageviews.
- Attention already separates pages that pageviews cannot: `/docs/getting-started` has 1,034
  pageviews and 1,546 minutes, `/` has 1,716 pageviews and 859 minutes.
- Read-through is computable but flat on the seeded data (27.8% to 37%, average scroll 58 to 65
  everywhere) because the generator draws scroll depth without regard to page type. The metric is
  sound; the seed needs the shape, which is a plan step.
- Influence needed a design decision that only the data could settle. Crediting every page a
  converting session saw puts `/dashboard` first at 3.16×, which is backwards: people reach the
  dashboard **by** converting. Crediting only pages seen before the session's first completion
  drops it from the list entirely and gives `/pricing` 1.5×, `/customers` 1.39×, `/features`
  1.29×, `/` 0.71×. That rule is part of D-016.
- Superseded plan notes, kept for the reasoning:
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
- [x] Design section (`docs/design/attention-and-influence.md`): the three definitions, the thresholds, the minimum counts, the Attention view layout.
- [x] Decision: D-016, taken on measured evidence.
- [x] Query: `attention(ctx)` and read-through per page from engagement rows; `influence(ctx, goal)` from the sessions CTE with the before-conversion rule; budgets on the seed fixture.
- [x] Seed: scroll depth and engaged time shaped per page type so read-through has real spread.
- [ ] Pages screen: the Attention view (Attention, Share, Read-through, Influence), the attention line reworded in minutes, the em dash under each minimum, one-sentence descriptions where the numbers are.
- [ ] Mock the view at 1280 and 375 with the measured numbers, and look before wiring (D-010).
- [ ] Landing panel and docs pages; the docs' counting page carries the three definitions verbatim.
- [ ] Verify: npm run verify; npm run test:integration; npm run test:e2e; measure on production.

## Progress log
- 2026-09-06 — Created from the owner's differentiation question; keep today's metrics, add the layer.
- 2026-09-06 — `lib/query/attention.ts` written with both primitives and wrapped in run.ts. Checked against production: the primitives reproduce the hand-measured numbers (/docs/getting-started 1,527 minutes, /pricing lift 1.48). `tests/integration/attention.integration.test.ts` proves the rules on a fixture built for them, including that a page only reachable after converting never earns influence.
- 2026-09-06 — The seed drew scroll depth uniformly regardless of page, so read-through was flat at 28 to 37% everywhere. It is now shaped by page family (long-form, marketing, app screen) and a unit test asserts the three separate.
- 2026-09-06 — Influence took 5,328 ms on the 90-day fixture and blew the statement timeout. The plan showed the `per` CTE joining back to the session CTE, which has no index, so every one of 18,825 rows rescanned 8,402 sessions. Carrying the converted flag through the `seen` CTE instead removed the join: 69 ms, a 77-fold improvement. Attention was 27 ms throughout.
- 2026-09-06 — Started by measuring all three metrics on production. That moved attention and read-through off pageview rows onto engagement rows, and settled the influence rule against the evidence (see Context). Design section and D-016 written before any code.

## Handoff
- **State:** the design (docs/design/attention-and-influence.md), D-016, both query primitives with their run wrappers, the seed's scroll shape, an integration test that proves each rule, and budgets (attention 60 ms, influence 140 ms) are done and green. The screen, the landing panel and the docs are not started.
- **Blocked on:** nothing
- **Next:** mock the Attention view at 1280 and 375 with the measured numbers, then build it on the Pages screen; then the landing panel and the docs' counting page.
- **Read first:** docs/design/attention-and-influence.md §3 for the view's columns, lib/query/attention.ts

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
