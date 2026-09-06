# TICKET-082: Micro-surveys, one question on a page

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
**Area:** feature

## Goal
A site can ask one question on a chosen page ("Was this helpful?", a 1 to 5 score after a conversion) and read the answers next to that page's attention and influence, so the numbers get a sentence from the people behind them.

## Context
- Owner, 2026-09-06: picked from the verticals review, to land after TICKET-080 so answers
  have attention and influence to sit beside. PostHog sells this as a separate product; nothing
  in the privacy-first tier has it.
- Model: a survey is (site, question, kind: yes-no | score | short text, target path glob,
  active from/to, sample rate), stored in public.surveys like goals. The tracker shows it
  through an opt-in chunk (`data-surveys`) fetched from a tiny public endpoint keyed by the
  site, renders a small unobtrusive prompt once per session (sessionStorage, no cookie), and
  records the answer as a custom event `survey` with props {id, answer}. Dismissal is
  recorded too so response rate is honest. Free-text answers are cut at 256 characters (the
  props rule) and are the one place a visitor can type; the docs say so and the site owner
  can turn text off.
- Screen: a Surveys section on the Events screen or the goal's page (decide in the design),
  with response rate, the distribution, and the page's attention beside it; free text as a
  list. Answers filter like any event property (`prop:answer`).
- Accessibility: the prompt is a `role="dialog"` that never traps focus, dismissible with
  Escape, and respects reduced motion. Never shown under GPC's anonymous mode? It can be: it
  stores no identity; keep it on.
- Landing and docs (rule 8): a landing panel staged from the survey results beside attention
  ("What readers said"); docs: tracking/script-tag.mdx `data-surveys`, a Using Lynq page on
  surveys, and the privacy page's "A visit, as stored" gains the answer row.

## Plan
- [ ] Design section: the prompt's look on a third-party page (must not clash with any site), the settings form, the results section; mock.
- [ ] Table and actions; the public config endpoint with caching; the tracker chunk and its tests.
- [ ] Results section and filters; seed a survey on the demo site.
- [ ] Landing panel and docs pages.
- [ ] Verify: npm run verify; npm run test:integration; npm run test:e2e.

## Progress log
- 2026-09-06 — Created from the verticals review; sequenced after TICKET-080.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** TICKET-080 (attention and influence) landing first, and the design section
- **Next:** —
- **Read first:** packages/tracker/src/extras.ts (the opt-in chunk pattern), lib/screens/events.ts

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
