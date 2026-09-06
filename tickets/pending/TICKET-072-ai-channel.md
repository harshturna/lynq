# TICKET-072: An AI channel for ChatGPT, Perplexity, Claude and Gemini referrals

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
**Area:** feature

## Goal
Visits that arrive from an AI assistant appear as their own channel, "AI", on Sources, in filters and in the channel classification, so a site can see how much of its traffic comes from answers rather than search results.

## Context
- From the DataFast review in the roadmap (Tier 1: "channels, including an AI channel for
  ChatGPT, Perplexity and Claude referrals"). Today lib/ingest/referrers.ts maps perplexity.ai
  to Organic Search and chatgpt.com / chat.openai.com to Referral; claude.ai, gemini.google.com,
  copilot.microsoft.com and you.com are not in the map. The `Channel` union (referrers.ts:9)
  gains "AI"; `classify()` handles a `utm_source` naming one of these the same way.
- Channel is a stored column on analytics.events, written at ingest (design §7.5), so existing
  rows keep their old channel unless backfilled; a one-off update on `source in (…)` for the
  seeded site is cheap and makes the demo show the channel. The rollup carries channel values
  per day, so TICKET-049's refresh must be re-run for the days touched (delete the site's
  rollup_state and call analytics.rollup_refresh(), as scripts/seed-events.ts does).
- Small and self-contained; the owner asked for it to be queued as ready to start.

## Plan
- [ ] Add "AI" to `Channel`; map claude.ai, chatgpt.com, chat.openai.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, you.com to it with their display sources; unit tests in referrers.test.ts.
- [ ] Seed: a small AI share in scripts/seed/generate.ts REFERRERS so the demo has the channel.
- [ ] Backfill the seeded site's channel column for those sources and rebuild its rollup; note the production write in the ticket.
- [ ] Verify: npm run verify; npm run test:integration (ingest and rollup change).

## Progress log
- 2026-09-06 — Created from the DataFast follow-up review.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** nothing
- **Next:** —
- **Read first:** lib/ingest/referrers.ts

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
