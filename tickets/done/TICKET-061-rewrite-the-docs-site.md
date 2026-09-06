# TICKET-061: Rewrite the docs site for tracker v2 and the Phase 1 product

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** docs

## Goal
docs-lynq.byharsh.com describes the product as it is: the one-line v2 snippet, every script attribute, the whole tracker API, how Lynq counts, what it stores, and the screens' features (goals and KPI, filters and shareable URLs, settings). No page installs the v1 script or promises a feature that does not exist.

## Context
- The docs live in a separate repository, `../lynq-docs` (github.com/harshturna/lynq-docs): Next 14
  pages router + Nextra 3 docs theme, MDX under `src/pages`, deployed on Vercel. Pages today:
  Introduction (the README's marketing bullets), Set up tracking (installs `lynq-js@v1.0.6` from
  jsDelivr with `data-domain="YOUR DOMAIN ID"` and a queue shim), Custom Events (`track()` only),
  TypeScript (types for `track` only), Lynq Proxy ("coming soon"), Lynq API ("coming soon").
- Facts the pages must match, read from the code 2026-09-06: packages/tracker/src/index.ts
  (attributes `data-site`, `data-vitals`, `data-outbound`, `data-auto-events`,
  `data-allow-localhost`, `data-respect-dnt`; API `track`, `identify`, `optOut`, `optIn`; GPC
  always honoured as anonymous mode; DNT only with the attribute; localhost ignored unless
  allowed; `lynqQueue` drained on load; `name` cut at 64, `uid` at 128), extras.ts (outbound
  and download clicks with the extension list, `data-lynq-event` with `data-lynq-prop-*`),
  vitals.ts (LCP, CLS, INP, FCP, TTFB, dcl, load, tti, tbt, resources), types.ts (session 30 min
  idle / 6 h max), lib/ingest/rows.ts (`normaliseProps`: 20 keys, key 32, value 256, `revenue`
  numeric), lib/ingest/url.ts (query allow-list), lib/ingest/schema.ts (20 events per batch),
  docs/design/phase-0-data-foundation.md §6.3 (bounce, duration), §8 (snippet, behaviour),
  app/(landing)/privacy/page.tsx (the privacy sentences, kept in step), settings.tsx (blocks:
  General, Tracking, Exclusions, Goals and KPI, Data), onboarding.tsx (snippet with
  `data-vitals`, three steps), goals form (kinds pageview with a path glob, event by name),
  components/shell/dimensions.ts (filter dimensions by group), lib/query/ranges.ts (ranges),
  lib/query/filters.ts (operators).
- Scope: content and information architecture in `lynq-docs`; the theme keeps Nextra's docs
  theme with the app's teal as the primary hue, Geist, light and dark as Nextra ships them (the
  docs are read, not the product; D-014's light-only rule is about the product's own pages).
  The Proxy page is replaced by a page on self-hosting the script path (what a reverse proxy
  must forward); the API page is removed until there is an API.
- This ticket lives here because the tickets directory is the project's record; the code
  changes are commits in `lynq-docs`, cited in Outcome.

## Plan
- [x] Information architecture: Introduction; Getting started (Install, Check it works, Pick a KPI); Tracking (The script tag, Custom events, Identify, Opt-out, Single-page apps, Self-hosting the path); Product (Filters and sharing, Goals and the KPI, How Lynq counts, Settings); Privacy; TypeScript.
- [x] Write every page from the facts in Context; the snippet everywhere is the one the app shows.
- [x] Theme: teal primary, Geist, title template, description; remove the Proxy and API pages.
- [x] Verify: `npm run build` in lynq-docs; read every page once in the browser at `next start`; commit and push lynq-docs; Vercel deploys.

## Progress log
- 2026-09-06 — Created and started: read the live site and the code it must describe.
- 2026-09-06 — Written and shipped as lynq-docs commit 0e5e913. Two corrections against the code while writing: the collector reads the client address only from the platform's headers (lib/ingest/client-ip.ts), so a reverse proxy would make every visitor one visitor; the "Proxying the script" page says it is not supported yet and why, instead of showing a config. The app has no Share button, so the filters page says to copy the address bar. The install links the app already emits (`/install/{nextjs,astro,html,wordpress}`) now resolve.

## Handoff
Closed; see Verification and Outcome.

## Verification
```
cd ../lynq-docs && npm run build     # 25 pages, compiled and prerendered without errors
npx next start -p 3007               # screenshots of /, /install, /tracking/events, /product/counting at 1280 and / at 390: read once
npm run verify                        # ticket check passes
```
Every framework path the app links to (`/install/nextjs`, `/install/astro`, `/install/html`, `/install/wordpress`) is in the build output.

## Outcome
Shipped in github.com/harshturna/lynq-docs (0e5e913, Vercel deploys from main): 20 pages in
five sections replacing six; the v1 jsDelivr install, the queue shim and the placeholder API
page are gone; theme with the app's teal, Geist, per-page titles and descriptions, an "Open
Lynq" link. Left out: screenshots of the product (the pages describe behaviour, which does not
go stale the way pictures do); a docs search index beyond Nextra's built-in one; the proxy
feature itself, which the page now says is not supported. No follow-ups.
