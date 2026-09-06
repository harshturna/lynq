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
- **Designed 2026-09-06: `docs/design/agents-mcp-and-cli.md`.** Three things need the owner's
  word before code (§3): one MCP endpoint inside the app with the CLI as its client (no REST
  API); tools return aggregates only, never events or sessions; the CLI is a published npm
  package (`@lynq/cli`), which needs an npm account from the owner to publish.
- The MCP SDK (`@modelcontextprotocol/sdk` 1.30) has a web-standard Streamable HTTP server
  transport that takes a `Request` and returns a `Response`, stateless with JSON responses, so
  it runs in a Next route handler; it needs zod ≥ 3.25, which the repo has (3.25.76). It also
  ships an in-memory transport for tests and a stdio client/server for the bridge.
- Rate limit: `allowKey` (TICKET-086) once per tool call. Auth: `resolveApiKey` + `read` scope;
  a `notes` scope unlocks `add_note`. Browser Origin refused as on `/api/bots`.
- Files read for the plan: `lib/query/run.ts` (the surface: summary, timeseries, breakdownMulti,
  goalStats, funnel, pathsTo, attention/influence, vitals + vitalsBreakdown, realtime, crawler*,
  notes), `lib/query/authorize.ts` (`Site`, `buildContext`; a key becomes a `Site` by reading
  `site_settings` the way `authorize()` does, without a Supabase session), `lib/query/filters.ts`
  (the dimension allow-lists the `breakdown` and `filters` schemas are generated from),
  `lib/query/ranges.ts` (`Range`), `lib/query/primitives.ts` (metrics), `lib/query/breakdown.ts`
  (`MetricSpec`), `lib/query/goals.ts`, `lib/query/vitals.ts`, `lib/screens/kpi.ts` and
  `goals.ts` (`listGoals`), `lib/api-keys.ts`, `lib/ingest/bots.ts` and `lib/notes/api.ts`
  (the keyed-handler shape), `packages/tracker/package.json` and `scripts/build-tracker.mjs`
  (how a package is built), docs `_meta.js` files.

## Plan
- [x] Design section: `docs/design/agents-mcp-and-cli.md` (transport, auth, the tools, the CLI, the docs).
- [x] Decision: D-017, per-site API keys, taken in TICKET-085; this ticket uses the `read` scope.
- [ ] Owner's word on §3, then D-NNN: one MCP endpoint with the CLI as its client; aggregates only; a published CLI.
- [ ] `lib/agents/site.ts`: a key to a `Site` (settings row, goals, KPI) without a session; `lib/agents/args.ts` (pure, tested): the shared `range`, `filters`, `compare` schemas from the allow-lists, to a `buildContext` call.
- [ ] `lib/agents/tools.ts`: the thirteen tools of design §4 registered on an `McpServer`, each returning `{ summary, data }`; results capped (breakdown 200 rows); `allowKey` per call; `add_note` gated on the `notes` scope.
- [ ] `app/api/mcp/route.ts`: `POST` through `WebStandardStreamableHTTPServerTransport` (stateless, JSON), bearer key with `read`, Origin refused; `GET`/`DELETE` answer 405.
- [ ] `packages/cli`: `lynq <tool> …` as an MCP client over fetch, table or `--json`, `lynq mcp` stdio bridge; built with esbuild to `packages/cli/dist`; a `bin`; version 0.1.0; not published by the ticket (owner's npm account).
- [ ] Tests: unit for the argument schemas and the table printer; integration for every tool against the seed fixture through the in-memory transport (the same numbers as `lib/query`); e2e: one `initialize` + `tools/list` + `summary` call against the running app with a key made in the fixture, and a refused key.
- [ ] Docs (`../lynq-docs`): top-level **For agents**: `index.mdx` (what it answers, the key), `setup.mdx` (Claude Code, Cursor, Codex), `tools.mdx` (the table with arguments), `cli.mdx`; the TypeScript page and the API keys scope row link it; home "What you get" line.
- [ ] Landing: a feature panel staged from a real exchange (a question, the tool call, the answer) beside a short lead; the AI story with TICKET-075's Bots panel.
- [ ] Verify: npm run verify; npm run test:integration; npm run test:e2e (touches `lib/query` only by reading it, but the fixture gains a key).

## Progress log
- 2026-09-06 — Created from the DataFast follow-up review.
- 2026-09-06 — Designed. Three decisions for the owner in the design's §3; the SDK's web-standard transport confirmed in the package tarball.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** designed, not started. `docs/design/agents-mcp-and-cli.md` is written; no code.
- **Blocked on:** the owner's word on the three decisions in the design's §3.
- **Next:** record them as a decision, then `lib/agents/args.ts` and its tests.
- **Read first:** docs/design/agents-mcp-and-cli.md, lib/query/run.ts

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
