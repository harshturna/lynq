# TICKET-088: Keyed endpoints were behind the login proxy

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** quality

## Goal
`/api/bots`, `/api/notes` and `/api/mcp` answer to a key alone. Today the auth proxy redirects any request without a session to `/login`, so none of the three worked from a server, a pipeline or an agent; only a browser with the owner's cookies could reach them, which is exactly the caller they refuse.

## Context
- Found on 2026-09-06 when the owner asked whether the MCP endpoint had been verified with a real client: the SDK's HTTP client got `text/html` (the login page) from every request. `proxy.ts` lists the public paths (`api/collect`, `api/live`, `api/demo`, `js/`) and the keyed endpoints from TICKET-075, TICKET-076 and TICKET-078 were never added.
- The e2e specs did not catch it because Playwright's `request` fixture in the `app` project carries the owner's storage state, so every request had a session. `tests/e2e/app/mcp.spec.ts` now uses a fresh request context with no cookies, and checks `/api/bots` and `/api/notes` the same way.
- Files: `proxy.ts` (the matcher), `tests/e2e/app/mcp.spec.ts`.

## Plan
- [x] `proxy.ts`: exclude `api/bots`, `api/notes`, `api/mcp` from the matcher.
- [x] `mcp.spec.ts`: a request context without storage state; the MCP handshake, a bots batch and a note through the API, all with the fixture key and no cookies.
- [x] A real MCP HTTP client (the SDK's) against the local app: tools listed, tools called, a bad dimension refused.
- [x] Verify: npm run verify; npm run test:e2e.

## Progress log
- 2026-09-06 — Found and filed.
- 2026-09-06 — Fixed: the three paths excluded from the proxy matcher; `mcp.spec.ts` runs in a request context with no storage state and also exercises `/api/bots` (a scope refusal, not a redirect) and `/api/notes` (create and delete). The SDK's own Streamable HTTP client against the local app listed the thirteen tools, answered site, summary, breakdown and bots, pinned a note, and refused a bad dimension with the expected sentence (scratchpad `t88-client.txt`).
- 2026-09-06 — The full e2e run then showed a hydration warning on the settings page: the fixture key now has a last-used time, and "just now" ticked over between the server render and hydration. Relative-time cells (the API keys table, and `DataTable` cells, which carry the Bots screen's "Last seen") now carry `suppressHydrationWarning`.

## Handoff
- **State:** shipped and closed.
- **Blocked on:** nothing.
- **Next:** none.
- **Read first:** proxy.ts

## Verification
```
node .mcp-client-check.tmp.mjs                   # the SDK's StreamableHTTPClientTransport against next dev: 13 tools, 5 answers, 1 refusal (before the fix: text/html from every request)
npm run verify                                   # 0 errors (18 pre-existing warnings), typecheck clean, 88 tickets, 238 unit tests passed
TEST_DATABASE_URL=… npm run test:e2e             # 88 passed (mcp.spec.ts without cookies; one hydration warning, fixed after)
TEST_DATABASE_URL=… npx playwright test … mcp notes settings bots   # 13 passed after the hydration fix, no warning
```

## Outcome
Shipped: `/api/bots`, `/api/notes` and `/api/mcp` reachable with a key and no session (`proxy.ts`); the spec that proves it; hydration checks suppressed on relative-time cells. Nothing left out. Lesson recorded here for the next keyed endpoint: add it to the proxy's exclusions and test it from a cookie-less request context.
