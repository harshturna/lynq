# For agents: the MCP server and the CLI

**Status:** designed (TICKET-078)
**Written:** 2026-09-06
**Ticket:** TICKET-078 · **Keys:** D-017 (`read` scope), TICKET-086 (rate limit)

## 1. Why

The dashboard answers the questions a person thinks to ask. An agent working in a repository
asks different ones, at the moment they matter: *did signups move after Tuesday's deploy*,
*which docs page do people leave from*, *is LCP worse this week*. Lynq already has every answer
as a typed, tenant-scoped query primitive (`lib/query`). This is the thinnest honest way to hand
those primitives to Claude Code, Cursor, Codex, and a shell.

## 2. Shape

```
agent (Claude Code, Cursor, Codex)  ──▶  POST /api/mcp  ──▶  lib/agents/tools.ts  ──▶  lib/query
terminal: npx @lynq/cli …           ──▶  (same endpoint,    one tool per question,      buildContext
stdio-only client: npx @lynq/cli mcp ──▶   MCP over HTTP)   JSON schema in, small        from the key's site
                                                             table out
```

**One endpoint, inside the app.** `POST /api/mcp` speaks MCP over Streamable HTTP, stateless
(one request, one answer; no session to lose across serverless instances), JSON responses
rather than SSE, with the SDK's web-standard transport in a Next route handler. Nothing new to
deploy and nothing new to run.

**The CLI is an MCP client.** `npx @lynq/cli summary --range last_7d` posts a `tools/call` to
the same endpoint and prints the result as a table, so there is one API surface to keep true.
`npx @lynq/cli mcp` runs a stdio MCP server that forwards to the endpoint, for clients that
cannot yet reach a remote HTTP server directly.

**Auth is D-017.** A bearer key with the `read` scope names the site; every tool call runs
through `buildContext` for that site and counts against the key's 120 requests a minute
(TICKET-086). A key with the `notes` scope may also pin a note (§4). A request carrying a
browser Origin is refused, as on every keyed endpoint.

## 3. Decisions to take before code

### 3.1 One MCP endpoint, and the CLI as its client (recommended)

The ticket left open "a REST endpoint the server can call from outside, or the server inside
the app". A REST API plus an MCP server is two surfaces, two schemas and two sets of docs for
the same twelve questions. MCP over HTTP is a JSON-RPC POST; a CLI can speak it in thirty
lines. So: one endpoint, MCP, and the CLI and the stdio bridge are both clients of it.

### 3.2 Tools answer questions; they never return events (recommended)

Every tool returns an aggregate: numbers, or a table of at most a few hundred rows, the same
things the screens show. There is no `events` or `sessions` tool. An agent that wants raw rows
is asking for an export, which is a different product with a different privacy story, and the
visitor id rotating daily is the promise that keeps aggregates safe to hand out.

### 3.3 The CLI is published; the tracker's "snippet first" rule does not apply

D-018 preferred a documented snippet over an npm package because thirty lines fit in a doc
page. A CLI does not: it is meant to be run, not pasted. `@lynq/cli` is a real package, one
dependency (the MCP SDK), built with esbuild like the tracker. Publishing needs an npm account
and is the owner's step; the ticket ships the package built and tested, and the docs say
`npx @lynq/cli` from the day it is published.

## 4. The tools

Arguments shared by the reading tools: `range` (a preset name, or `{from, to}` as dates in the
site's timezone; default `last_30d`), `filters` (a list of `{dimension, op, values}`, the same
allow-list the dashboard uses), and `compare` (`previous_period` or `previous_year`) where the
answer has a "before".

| Tool | Answers | Returns |
|---|---|---|
| `site` | what is this site | url, hostnames, timezone, goals, the KPI, the dimensions and metrics the other tools accept |
| `summary` | how is the site doing | visitors, sessions, pageviews, bounce rate, engaged time, revenue; the previous period beside them when `compare` is set |
| `timeseries` | how did a metric move | `{bucket, value, previous?}` per bucket for one metric, at the range's granularity |
| `breakdown` | which pages / sources / countries / … | rows of one dimension with the chosen metrics, ranked, limited (default 20, max 200); prop breakdowns through `prop:<key>` |
| `goals` | are people converting | every goal with completions, converting sessions, conversion, revenue, median time; the KPI marked |
| `funnel` | where do they drop | counts per step for a list of steps (any / page glob / event) |
| `paths` | how do they reach a page or an event | the top paths into a goal-shaped target |
| `attention` | which pages hold and help | attention share, read-through and influence per page (D-016) |
| `vitals` | is it fast | p75 per Web Vital with the threshold band, and the worst pages |
| `realtime` | who is here now | visitors in the last minutes and the pages they are on |
| `bots` | what do crawlers fetch | hits by family, crawlers and pages, the orientation files (D-018) |
| `notes` | what happened when | the notes in the range |
| `add_note` | mark what I just did | pins a note; needs the `notes` scope; the author is `key:<name>` |

Each result carries a one-line `summary` sentence beside the data, the same sentence the
screen's description would speak, so a model can quote it without arithmetic.

## 5. The CLI

`lynq <tool> [--range …] [--filter dimension=op:value …] [--compare …] [--json]`, one command
per tool with the tool's arguments as flags, a table on stdout by default and JSON with
`--json`. `LYNQ_API_KEY` from the environment, `LYNQ_URL` to point at a self-hosted deployment.
`lynq mcp` is the stdio bridge. Exit code 1 on a refused key, 2 on a bad argument, both with the
server's sentence.

## 6. What the docs say

A new top-level section, **For agents**: a page on what the server answers and how a key is
made; a setup page with the three clients' configuration (Claude Code's `claude mcp add`,
Cursor's `mcp.json`, Codex's config through the stdio bridge); the tool list; the CLI. The
TypeScript page links it. The landing gains a panel staged from a real exchange.

## 7. Out of scope for v1

A REST API; raw events or sessions; writes beyond a note; OAuth for the endpoint (a key is
enough for a server-side client, and the browser refusal keeps it out of pages); a hosted
"ask a question" chat inside the dashboard, which is a product of its own.
