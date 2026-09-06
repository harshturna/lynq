# TICKET-085: Per-site API keys

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** infra

## Goal
A site owner can create, name, scope and revoke API keys for one site, and the app can resolve a key to a site and its scopes. Nothing consumes a key yet; this unblocks the three tickets that need one.

## Context
- Owner, 2026-09-06, after the recommendation that this is the highest-leverage next step: three
  pending tickets each carry "decide how a non-browser authenticates" as a sub-step, so whichever
  started first would decide it alone and the other two would inherit it. TICKET-075 (AI bot
  traffic, a server-side middleware posting crawler hits), TICKET-076 (a notes API a deploy
  pipeline calls) and TICKET-078 (an MCP server reading a site's analytics). The docs' proxying
  page also names a fourth use: a proxy proving a forwarded visitor address is genuine.
- The browser tracker stays unauthenticated, and that is deliberate: `/api/collect` gates on the
  page's hostname matching a registered site, the payload is public behaviour, and a secret in a
  public script would be theatre. The keyed path is separate and additional.
- Named **API keys**, not "site keys" as the earlier tickets called them; the owner's own words
  were "so it's like an api key", and it is the term people know. The three dependent tickets are
  updated to match.
- Files read: lib/screens/settings-actions.ts (the `owner()` guard: session, guest refusal,
  `resolveSite`, and the `SaveResult` shape every section returns), lib/screens/settings.ts
  (`SettingsData`, read in a few cheap queries), the settings screen's section list and `Block`
  pattern, lib/actions.ts (the guest guard), supabase/migrations/20260905020000_analytics_schema.sql
  (table and grant conventions, `service_role` default privileges).
- Scope of this ticket: the table, generation and resolution, the settings section, tests and
  docs. No endpoint consumes a key here; that belongs to the tickets that need it.

## Plan
- [x] Decision (decide skill): the key's shape, storage, scopes and revocation, as a D-NNN.
- [x] Migration `20260906020000_api_keys.sql`: `analytics.api_keys`, keyed by a hash, with scopes, a display prefix, created, last used and revoked timestamps.
- [x] `lib/api-keys.ts`: generate, hash, and `resolveApiKey(token)` returning the site and scopes, refusing revoked keys and stamping last used.
- [x] Settings: `createApiKey` and `revokeApiKey` actions on the existing `owner()` guard, an "API keys" section that shows the token once, and the keys in `SettingsData`.
- [x] Unit tests for the token and scope logic; an integration test that a revoked key resolves to nothing and a live one resolves to its site.
- [x] Docs: a page on creating and using a key, and what each scope allows.
- [x] Verify: npm run verify; npm run test:integration; npm run test:e2e.

## Progress log
- 2026-09-06 — Created and started; files read and scope settled before code.
- 2026-09-06 — Two build problems worth recording. The token helpers imported the database client at module load, so the pure functions could not be unit tested; the client is now imported inside `resolveApiKey`. Then the settings screen, a client component, imported the server-only module for two labels and broke the whole client bundle, taking eleven a11y specs down with it; the scopes and their labels now live in `lib/api-key-scopes.ts`, which is client-safe, and the server module re-exports them.
- 2026-09-06 — The new "Name" field collided with General's in the settings e2e. Renamed to "Key name", which is clearer anyway and leaves one label per page.
- 2026-09-06 — Migration pushed to production and the table confirmed there.

## Handoff
Closed; see Verification and Outcome.

## Verification
```
npm run verify                                   # lint, typecheck, ticket check, 170 unit tests: pass
TEST_DATABASE_URL=... npm run test:integration   # 9 files, 51 tests: pass
TEST_DATABASE_URL=... npm run test:e2e           # 80 passed (2.9 m)
cd ../lynq-docs && npm run build                 # compiled, 27 pages
npx supabase db push --linked                    # 20260906020000_api_keys.sql applied; columns confirmed in production
```
`tests/integration/api-keys.integration.test.ts` proves a live key resolves to its site and
scopes, a revoked or unknown one resolves to nothing, no column holds the token itself, and the
scope check refuses a value outside the three.

## Outcome
Shipped: D-017; `analytics.api_keys`; `lib/api-key-scopes.ts` and `lib/api-keys.ts` (generation,
hashing, bearer parsing, resolution with a coarse last-used stamp); create and revoke actions on
the existing owner guard, capped at 20 live keys per site; the Settings "API keys" section that
shows a token once; unit and integration tests; and the docs' API keys page, linked from the
settings page. TICKET-075, 076 and 078 now cite D-017 instead of carrying the question.
Left out deliberately: no endpoint consumes a key yet, which belongs to the tickets that need
one; and the rule that a key is refused on a request carrying a browser origin is written into
D-017 and the docs but has nothing to enforce it until the first keyed endpoint exists, which
that ticket must implement. No follow-ups filed.
