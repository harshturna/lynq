# TICKET-066: The favicon is the teal mark

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
The browser tab shows the brand mark the new UI uses (the teal rounded square beside LYNQ in every nav), in the app and in the docs, instead of the old four-colour bars.

## Context
- Owner, 2026-09-06: "the fav icon is still old". app/favicon.ico was the old 250 px logo,
  linked from app/layout.tsx `metadata.icons`; lynq-docs/public/favicon.ico was the same image
  (a PNG with an .ico name) and public/logo.png the same again for the docs header.
- The mark is drawn in app/(landing)/_landing/nav.tsx and components/shell/top-nav.tsx as a
  10 px square with a 3 px radius in --teal (#0f766e); the icon is that shape at 64 px with the
  same proportion of radius (19/64).
- Next's file convention: app/icon.svg and app/apple-icon.png are served and linked without
  metadata; the metadata `icons` entry is removed with the old file.

## Plan
- [x] app/icon.svg (the mark), app/apple-icon.png (180 px via rsvg-convert); drop app/favicon.ico and the metadata entry.
- [x] lynq-docs: a real multi-size favicon.ico (16/32/48/64, PIL) and a 96 px logo.png from the same SVG.
- [x] Verify: npm run verify; after the deploys, `curl -I` on /icon.svg and the docs favicon.

## Progress log
- 2026-09-06 — Done.

## Handoff
Closed.

## Verification
```
npm run verify   # pass, 157 unit tests
```
DEPLOY_RESULT

## Outcome
Shipped: the app icon files and layout change; lynq-docs commit e672b61. Nothing left out; no follow-ups.
