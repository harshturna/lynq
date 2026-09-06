# TICKET-078: MCP server and CLI over the query layer

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
**Area:** feature

## Goal
An agent (Claude Code, Cursor, Codex) or a terminal can ask a site's numbers directly: an MCP server exposing the query primitives as tools, and a CLI with the same commands, both authenticated with a site key.

## Context
- From the DataFast review; Phase 4 in the roadmap ("Ask-your-data over the query API, MCP
  server and CLI"). The query layer (lib/query: summary, timeseries, breakdownMulti, goals,
  funnel, paths, vitals, realtime) is the surface; it is typed and tenant-scoped through
  buildContext (lib/query/authorize.ts), so the server is a thin adapter that turns a site key
  into a context and each primitive into a tool with a JSON schema.
- Depends on site keys (the same decision as TICKET-075 and the notes API) and on a REST or
  RPC endpoint the server can call from outside the app, or the server runs inside the app as a
  route handler speaking MCP over HTTP. Decide in the design; the second keeps one deployment.
- Package shape: packages/mcp (published) and packages/cli, or one package with both entry
  points. Tool results should be small tables and numbers, never raw events.

## Plan
- [ ] Design section: transport, auth, the tool list and their schemas, rate limits.
- [ ] Decision on site keys (shared with TICKET-075).
- [ ] Route handler or package; CLI; docs pages; tests against the seed fixture.
- [ ] Docs: a new top-level section ("Integrations" or "For agents") with the MCP setup for Claude Code, Cursor and Codex, the tool list, the CLI commands, and site-key creation; the TypeScript page links it.
- [ ] Landing: a feature panel staged from a real agent exchange ("Ask why signups dropped") beside a short lead, and a docs-home line; this and TICKET-075 are the AI story the landing currently lacks.

## Progress log
- 2026-09-06 — Created from the DataFast follow-up review.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** a Phase 4 design section and the site-key decision
- **Next:** —
- **Read first:** lib/query/authorize.ts, lib/query/run.ts

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
