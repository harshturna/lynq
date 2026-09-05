# Decisions

Append-only. Record only choices that are expensive to reverse or whose reasoning would be
confusing to rediscover. Routine implementation choices live in the ticket that made them.
Accepted decisions are immutable except for their status and a pointer to a superseding decision.

## Entry format

```markdown
## D-NNN — Short title
- **Status:** Accepted | Rejected | Superseded by D-NNN
- **Date:** YYYY-MM-DD
- **Context:** what forced the choice
- **Decision:** what was chosen
- **Rejected alternatives:** what else was considered and why it lost
- **Consequences:** what becomes easier and harder
```

## D-001 — Quality of existing features first, then UI overhaul, then new features
- **Status:** Accepted
- **Date:** 2026-09-05
- **Context:** The revamp has three tracks. The review found the data path caps at 5,000 rows,
  two security holes, and several headline metrics built on unreliable signals. Both the UI and
  every new feature depend on a query layer that does not exist yet.
- **Decision:** Fix what leaks or lies on the current code, then rebuild the data layer and rewire
  the existing screens to it with no visual change. UI shell second. New features last.
- **Rejected alternatives:** UI first, rejected because a new UI on the current server actions
  still shows wrong numbers and gets rebuilt when the query layer lands. Features first, rejected
  because funnels and retention cannot be expressed on fetch-raw-rows-and-reduce-in-JS.
- **Consequences:** Nothing visible ships for the first few weeks. Every later feature is a query
  plus a screen inside a shell that already exists.

## D-002 — ClickHouse for events, Supabase Postgres for metadata
- **Status:** Accepted
- **Date:** 2026-09-05
- **Context:** Funnels, paths, retention, p75 vitals, and realtime all need columnar scans over
  events. Postgres with Timescale would work to roughly 10 to 20 million events and then require
  the same migration under load.
- **Decision:** One wide `events` table in ClickHouse, materialised views for rollups and sessions.
  Supabase keeps auth, sites, teams, goals, segments, dashboards, annotations, alerts, API keys.
- **Rejected alternatives:** Postgres plus TimescaleDB, rejected because migrating later means
  writing every query twice. Keeping the current five-table Supabase schema, rejected because it
  cannot pre-aggregate and its custom events are one row per property.
- **Consequences:** Multi-tenancy is enforced in the query layer rather than by RLS. One more system
  to operate. Every analytics query is written once against the final store.

## D-003 — Cookieless identity by default, identified users opt-in
- **Status:** Accepted
- **Date:** 2026-09-05
- **Context:** The tracker stores a permanent UUID in localStorage while the landing page claims
  cookie-free, privacy-first tracking. A persistent identifier needs consent under GDPR and
  ePrivacy, so the claim is currently false.
- **Decision:** Visitor id is a daily-rotating salted hash of IP, user agent, and site, computed at
  ingest. `lynq.identify()` opts a site into stable ids for logged-in users.
- **Rejected alternatives:** Keep the localStorage UUID and add a consent banner requirement,
  rejected because it removes the product's main differentiator against GA4.
- **Consequences:** Retention and returning-visitor metrics are limited to within a day for
  anonymous visitors, as with Plausible and Fathom. No consent banner needed in default mode.
