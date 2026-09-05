# TICKET-003: Parse the client IP correctly and take geo from platform headers

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Area:** quality
**Completed:** 2026-09-05

## Goal
Stop every session behind a proxy chain from geolocating as Unknown, and stop awaiting a
rate-limited third-party HTTP call on the session-start path when the hosting platform already
supplies country and city in request headers.

## Context
- `app/api/lynq/route.ts` line 63 reads the whole `x-forwarded-for` header and passes it to
  `getCountryAndCityFromIp` in `lib/actions.ts`. Behind any proxy chain the header is
  `client, proxy1, proxy2` and the lookup fails. The first entry is the client.
- `getCountryAndCityFromIp` calls ip-api.com over plain HTTP (the free tier does not offer HTTPS),
  limited to 45 requests a minute and licensed non-commercial. It is awaited inline on
  `session-start` and `initial-custom-event`, so it adds latency to every new session.
- Vercel sets `x-vercel-ip-country` (ISO 3166-1 alpha-2), `x-vercel-ip-country-region`, and
  `x-vercel-ip-city` (URL-encoded) on every request. Cloudflare sets `cf-ipcountry`. The app
  uses Vercel Analytics, so Vercel is the likely host; the code handles both and falls back to
  ip-api when neither header is present (local dev, other hosts).
- The database and the dashboard use full country names. `lib/geo/country-centroids.ts` keys
  its table by name and stores the ISO code on each entry, so a code-to-name lookup can come
  from that table. Intl.DisplayNames was considered for the conversion and rejected as the
  primary source: 8 of its 166 names differ from the table (Bosnia & Herzegovina, Congo -
  Kinshasa, Côte d'Ivoire, Macao SAR China, Myanmar (Burma), Palestinian Territories, Congo -
  Brazzaville, Trinidad & Tobago). It stays as the fallback for codes the table lacks.
- Ruled out: dropping ip-api entirely. Local development and non-Vercel hosts would lose geo.
  Ruled out: MaxMind GeoLite2. Right answer for self-hosting, but it is a download-and-update
  pipeline and belongs in the ingest rewrite (Phase 0), not a quick fix.

## Plan
- [x] Read `app/api/lynq/route.ts`, `lib/actions.ts` getCountryAndCityFromIp,
      `lib/geo/country-centroids.ts`.
- [x] `lib/geo/country-centroids.ts`: export `countryNameFromCode(code)` built from the table,
      Intl.DisplayNames fallback, null for unknown or placeholder codes (XX, T1, empty).
- [x] New `lib/geo/request-geo.ts`: `getClientIp(headers)` returns the first `x-forwarded-for`
      entry, else `x-real-ip`, else null. `getGeoFromHeaders(headers)` returns
      `{ country, city }` from Vercel or Cloudflare headers, or null when absent.
- [x] `app/api/lynq/route.ts`: read headers once; use header geo when present, otherwise the
      ip-api lookup with the parsed client IP.
- [x] Verify: `npm run verify`, `npm run build`, and a node script exercising the two helpers with
      Vercel headers, Cloudflare headers, a proxy-chain forwarded-for, and no headers.

## Progress log
- 2026-09-05 — Planned and started.
- 2026-09-05 — Implemented. First test run showed Intl returning "Unknown Region" for a code it
  has no name for; the fallback now rejects any name containing "unknown".

## Handoff
Closed. See Outcome.

## Verification
```
npm run verify   # lint 0 errors / 44 warnings, tsc clean, ticket check pass
npm run build    # compiled, 8 pages, exit 0
node geo-test/run.js   # helpers compiled with tsc to a scratch dir and driven with fake headers
  Vercel, proxy chain       ip="203.0.113.9"   geo={"country":"India","city":"New Delhi"}
  Vercel, unknown country   ip="203.0.113.9"   geo={"country":"Unknown","city":"Unknown"}
  Cloudflare                ip="198.51.100.4"  geo={"country":"Democratic Republic of the Congo","city":"Unknown"}
  No platform headers       ip="192.0.2.7"     geo=null      (falls back to ip-api)
  Nothing at all            ip=null            geo=null
  code lookups: US=United States  GB=United Kingdom  TR=Turkey  CD=Democratic Republic of the Congo
                BA=Bosnia and Herzegovina  ZZ=null  T1=null
```
Not tested against a real Vercel request; header names are from Vercel's and Cloudflare's
documented request headers.

## Outcome
Shipped: `lib/geo/request-geo.ts` with `getClientIp` and `getGeoFromHeaders`,
`countryNameFromCode` in the centroid module, and the ingest route using platform geo headers
first with the ip-api lookup only as a fallback on the parsed client IP.

Left out: replacing ip-api entirely (MaxMind belongs in the Phase 0 ingest rewrite), region
storage (no column for it yet), and any change to how the sessions table stores geo.

Follow-up tickets: none.
