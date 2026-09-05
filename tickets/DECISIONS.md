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

## D-004 — Phase 0 design v4 is the plan, including the five visible cutover changes
- **Status:** Accepted
- **Date:** 2026-09-05
- **Context:** `docs/design/phase-0-data-foundation.md` v4, after three adversarial reviews
  (44 findings folded in), was presented to the owner with the five things that change
  visibly on cutover: Visitors becomes visitor-days over multi-day ranges and steps down on
  cutover day; average time and bounce rate become engagement-based and single-pageview-based
  and read lower; referrers become per-session; time series bucket in the site timezone, not
  the viewer's; the Performance tab loses the JS heap card.
- **Decision:** Build Phase 0 as designed in v4. The five changes are accepted as consequences
  of D-003 and of correct definitions, not regressions. Implementation follows the nine tickets
  in §17 of the design (TICKET-012 to TICKET-020).
- **Rejected alternatives:** A permanent visitor identifier to keep the Visitors number
  continuous, rejected by D-003. Keeping the JS heap metrics, rejected because they are
  Chrome-only, non-standard and not a performance signal. Keeping viewer-timezone bucketing,
  rejected because a shared dashboard would show different numbers to different viewers.
- **Consequences:** Phase 1 must explain the cutover step change in the UI (an annotation on
  the cutover date). The design document is the reference for every Phase 0 ticket; changes to
  it go through a new decision or a ticket's progress log depending on size.

## D-005 — Privacy and retention defaults for tracker v2 and the event store
- **Status:** Accepted
- **Date:** 2026-09-05
- **Context:** The design leaves five defaults to the owner (§15). Each is cheap to change per
  site later but expensive to change as a default once sites exist.
- **Decision:** Retention 24 months (table TTL). Global Privacy Control is honoured
  unconditionally with no per-site switch: it forces anonymous mode. Do Not Track is honoured
  only when the snippet carries `data-respect-dnt`, default off. `store_user_ids` off: raw ids
  live in Postgres for 90 days only when a site opts in; ClickHouse only ever holds the hash.
  `store_titles` off. The v1 adapter and the v1 script URL are removed after 30 consecutive days
  with no v1 rows, and the landing-page privacy copy changes at that point.
- **Rejected alternatives:** A per-site switch for GPC, rejected because ignoring a recognised
  legal opt-out would make Lynq the processor that facilitated it. Storing raw user ids by
  default, rejected because customers will send email addresses. Storing page titles by
  default, rejected because search pages and logged-in apps put user content in them.
- **Consequences:** Retention, funnels and attribution beyond one day need `identify()`. Sites
  that want DNT honoured must add an attribute to their snippet. Some customers will ask for
  titles and raw ids and will find a switch in settings.
