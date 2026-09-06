# TICKET-070: aivia.byharsh.com installs the v2 snippet

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ops

## Goal
The one real site on Lynq sends events through the v2 tracker: one deferred tag from lynq.byharsh.com instead of the frozen v1 script from jsDelivr, so its traffic lands in analytics.events as ingest version 2 with Web Vitals and outbound clicks.

## Context
- The owner item left from Phase 0 (design §11): the aivia repository (../aivia,
  github.com/harshturna/aivia, Next 14) loaded `lynq-js@v1.0.6` from jsDelivr with a
  `beforeInteractive` queue shim, `data-domain="aivia.byharsh.com"`, and called
  `window.lynq.track(...)` from the landing navbar with a `Window.lynq` type of `track` only.
- Changed there: app/layout.tsx has the one-line tag (`data-vitals`, `data-outbound`) and no
  shim, the `next/script` import goes with it; types/lynq.d.ts is the docs' declaration with
  `lynq` optional; components/landing/navbar.tsx calls `window.lynq?.track(...)` so a click
  before the deferred script loads is a no-op instead of a TypeError. The v2 tracker drains a
  pre-load `lynqQueue` too, but the guard is simpler than a shim.
- Site 31 is registered with hostname aivia.byharsh.com, so the collector accepts the events
  as soon as the deploy is live.

## Plan
- [x] Edit the three files; `npx tsc --noEmit` and `npm run lint` in aivia; commit and push (Vercel deploys).
- [x] After the deploy: the v2 tag is served (a real visit is needed for rows; see Verification).

## Progress log
- 2026-09-06 — Done.

## Handoff
Closed.

## Verification
```
aivia: npx tsc --noEmit; npm run lint   # tsc clean; lint: one pre-existing useEffect warning, unrelated
aivia commit 9ea888f pushed to main
production: after the deploy, aivia.byharsh.com serves the v2 tag and not the v1 one. A headless visit got 202 from the collector but wrote no rows: the headless browser's user agent is classified as a bot and dropped, as designed (TICKET-007). The first real visit writes ingest_version 2 rows for site 31; the owner chose not to wait for one.
```

## Outcome
Shipped in the aivia repository. Left for the owner: remove `NEXT_PUBLIC_LYNQ_SCRIPT_VERSION` from the Vercel project if it still exists, and archive harshturna/lynq-js so the jsDelivr URL stays frozen at v1.
