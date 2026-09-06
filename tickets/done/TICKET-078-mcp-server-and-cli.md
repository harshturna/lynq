# TICKET-078: MCP server and CLI over the query layer

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
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
- [x] Owner's word on §3, then D-NNN: **D-019**. One MCP endpoint; aggregates only; no CLI and no package (the owner cut the CLI; stdio clients use `mcp-remote`).
- [x] `lib/agents/site.ts`: a key to a `Site` (settings row, goals, KPI) without a session; `lib/agents/args.ts` (pure, tested): the shared `range`, `filters`, `compare` schemas from the allow-lists, to a `buildContext` call.
- [x] `lib/agents/tools.ts`: the thirteen tools of design §4 registered on an `McpServer`, each returning `{ summary, data }`; results capped (breakdown 200 rows); `allowKey` per call; `add_note` gated on the `notes` scope.
- [x] `app/api/mcp/route.ts`: `POST` through `WebStandardStreamableHTTPServerTransport` (stateless, JSON), bearer key with `read`, Origin refused; `GET`/`DELETE` answer 405.
- [x] Tests: unit for the argument schemas; integration for every tool against the seed fixture through the in-memory transport (the same numbers as `lib/query`); e2e: one `initialize` + `tools/list` + `summary` call against the running app with a key made in the fixture, and a refused key.
- [x] Docs (`../lynq-docs`): top-level **For agents**: `index.mdx` (what it answers, the key), `setup.mdx` (Claude Code, Cursor, Codex), `tools.mdx` (the table with arguments); the TypeScript page and the API keys scope row link it; home "What you get" line.
- [x] Landing: a feature panel staged from a real exchange (a question, the tool call, the answer) beside a short lead; the AI story with TICKET-075's Bots panel.
- [x] Verify: npm run verify; npm run test:integration; npm run test:e2e (touches `lib/query` only by reading it, but the fixture gains a key).

## Progress log
- 2026-09-06 — Created from the DataFast follow-up review.
- 2026-09-06 — Designed. Three decisions for the owner in the design's §3; the SDK's web-standard transport confirmed in the package tarball.
- 2026-09-06 — Owner: "just mcp". D-019 recorded; the CLI and the package are out, `mcp-remote` covers stdio clients. Started.
- 2026-09-06 — Built. `lib/agents/args.ts` (the shared range, filters and compare schemas from the dashboard's allow-lists, and the sentence-shaped refusals), `lib/agents/site.ts` (a key to a `Site` plus url, hostnames and goals, no session), `lib/agents/tools.ts` (thirteen tools on `McpServer`, `allowKey` per call, `add_note` gated on the notes scope, `realtime` without the raw event list), `app/api/mcp/route.ts` (stateless web-standard transport, JSON responses, Origin refused, GET/DELETE 405). The SDK needs zod ≥ 3.25; the repo already had 3.25.76.
- 2026-09-06 — Tests: the argument schemas (unit); every tool against a 20-day seed fixture through the SDK's in-memory transport, checked against `lib/query` for the same numbers (integration); the HTTP handshake, a tools/list and a summary call with a fixed read key created by the e2e fixture, plus the three refusals (e2e). The fixture hashes the key with node:crypto rather than importing `lib/api-keys`, which is `server-only` and cannot load under Playwright.
- 2026-09-06 — Docs: a top-level "For agents" section (what it answers, connect Claude Code / Cursor / Codex / mcp-remote, the tool table); links from the home, the API keys scope row and the TypeScript page. Landing: a "For agents" panel staged as one exchange, looked at at 1280 and 375.

## Handoff
- **State:** shipped and closed.
- **Blocked on:** nothing.
- **Next:** none for this ticket.
- **Read first:** docs/design/agents-mcp-and-cli.md, lib/agents/tools.ts

## Verification
```
npm run verify                                   # 0 errors (18 pre-existing warnings), typecheck clean, 87 tickets, 238 unit tests passed
TEST_DATABASE_URL=… npm run test:integration     # 13 files / 66 tests passed (agents: 7 tests over the thirteen tools)
TEST_DATABASE_URL=… npm run test:e2e             # 87 passed (mcp.spec.ts: handshake, tools/list, summary, 401/403/405)
cd ../lynq-docs && npm run build                 # built, 33 pages
```
No migration: the endpoint reads through existing tables and D-017 keys. Looked at: scratchpad `landing-agents-1280.png` / `-375.png`.

## Outcome
Shipped: `POST /api/mcp`, an MCP server over Streamable HTTP inside the app, authenticated with a read-scope key (D-017), rate limited per key (TICKET-086), with thirteen tools (site, summary, timeseries, breakdown, goals, funnel, paths, attention, vitals, realtime, bots, notes, add_note) each returning a sentence and an aggregate; the "For agents" docs section and the landing panel; unit, integration and e2e coverage.

Left out, per D-019 and the owner: the CLI and any npm package (`mcp-remote` covers stdio-only clients); a REST API; raw events or sessions; OAuth. The ticket's title keeps "CLI" for the record of what was considered.

Follow-ups: TICKET-088, filed the same day when the owner asked whether a real client had been tried: the login proxy was redirecting every keyed endpoint, and the e2e request context's cookies had hidden it. Fixed there. If a terminal client is wanted later it is one more client of this endpoint.
