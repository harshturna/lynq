/**
 * Backfill the old Supabase tables into analytics.events (design §10).
 *
 *   npx tsx scripts/backfill-events.ts --site aivia.byharsh.com --until 2026-09-05T15:26:54.220Z [--dry-run]
 *
 * Reads rows with created_at < until, wipes any previous backfill for the
 * site below that instant, and inserts ingest_version = 0 rows built with the
 * same hashing, URL, referrer and classification code the ingest uses.
 * Re-runnable. Prints every country name it could not map instead of
 * silently writing ''.
 */
import countries from "i18n-iso-countries";
import postgres from "postgres";
import { idFromText, legacyVisitorId, utcDay } from "../lib/ingest/hash";
import { normaliseHostname } from "../lib/ingest/hostnames";
import { classify } from "../lib/ingest/referrers";
import {
  EVENT_COLUMNS,
  type EventRow,
  normaliseProps,
} from "../lib/ingest/rows";
import {
  cleanText,
  parsePageUrl,
  parseReferrer,
  parseUtm,
} from "../lib/ingest/url";
import { legacySalt } from "../lib/ingest/v1-adapter";

const args = new Map<string, string | true>();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a?.startsWith("--")) continue;
  const next = process.argv[i + 1];
  if (next && !next.startsWith("--")) {
    args.set(a.slice(2), next);
    i++;
  } else args.set(a.slice(2), true);
}
const siteUrl = String(args.get("site") ?? "");
const untilArg = String(args.get("until") ?? "");
const dryRun = args.get("dry-run") === true;
if (!siteUrl || !untilArg) {
  console.error("usage: --site <url> --until <ISO> [--dry-run]");
  process.exit(2);
}
const until = new Date(untilArg);
if (Number.isNaN(until.getTime())) {
  console.error("--until must be an ISO timestamp");
  process.exit(2);
}
const dbUrl = process.env.LYNQ_DB_POOLER_URL;
const secret = process.env.LYNQ_IDENTITY_SECRET;
if (!dbUrl || !secret) {
  console.error("LYNQ_DB_POOLER_URL and LYNQ_IDENTITY_SECRET must be set");
  process.exit(2);
}

const sql = postgres(dbUrl, {
  prepare: false,
  max: 1,
  types: { bigint: postgres.BigInt },
});

// ------------------------------------------------------------- mappings

const COUNTRY_ALIASES: Record<string, string> = {
  UK: "GB",
  USA: "US",
  Russia: "RU",
  "South Korea": "KR",
  "Hong Kong": "HK",
  Czechia: "CZ",
  "Ivory Coast": "CI",
};
const unmappedCountries = new Map<string, number>();
function countryCode(name: string | null): string {
  if (!name || name === "Unknown") return "";
  const trimmed = name.trim();
  if (COUNTRY_ALIASES[trimmed]) return COUNTRY_ALIASES[trimmed];
  if (/^[A-Za-z]{2}$/.test(trimmed) && countries.isValid(trimmed.toUpperCase()))
    return trimmed.toUpperCase();
  const code = countries.getAlpha2Code(trimmed, "en");
  if (code) return code;
  unmappedCountries.set(trimmed, (unmappedCountries.get(trimmed) ?? 0) + 1);
  return "";
}

function device(d: string | null): string {
  const v = (d ?? "").toLowerCase();
  return v === "desktop" || v === "mobile" || v === "tablet" ? v : "";
}
function os(o: string | null): string {
  switch (o) {
    case "Mac":
      return "Mac OS";
    case "Ios":
      return "iOS";
    case "Unknown":
    case null:
      return "";
    default:
      return o;
  }
}
function browser(b: string | null): string {
  return b === "Unknown" || !b ? "" : b;
}

// ------------------------------------------------------------------ load

type OldSession = {
  session_id: string;
  client_id: string;
  created_at: Date;
  session_duration: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  operating_system: string | null;
};
type OldPageView = {
  id: bigint;
  created_at: Date;
  page: string;
  session_id: string;
  pathname: string;
  referrer: string | null;
};
type OldVital = Record<string, string | null> & {
  created_at: Date;
  session_id: string | null;
};
type OldCustom = {
  event_id: string;
  created_at: Date;
  event_name: string;
  property_name: string | null;
  property_value: string | null;
  session_id: string;
  page_url: string;
};

async function main() {
  const [site] = await sql<
    { id: bigint }[]
  >`select id from public.websites where url = ${siteUrl} and deleted_at is null`;
  if (!site) throw new Error(`no website with url ${siteUrl}`);
  const siteId = Number(site.id);
  const hostnames = (
    await sql<
      { hostname: string }[]
    >`select hostname from analytics.site_hostnames where site_id = ${siteId}`
  ).map((r) => r.hostname);
  const salt = legacySalt(secret as string);

  const sessions = await sql<OldSession[]>`
    select session_id, client_id, created_at, session_duration::text, country, city, device, browser, operating_system
    from public.sessions where website_url = ${siteUrl} and created_at < ${until} order by created_at`;
  const pageViews = await sql<OldPageView[]>`
    select id, created_at, page, session_id, pathname, referrer
    from public.page_views where website_url = ${siteUrl} and created_at < ${until} order by session_id, created_at, id`;
  const vitals = await sql<OldVital[]>`
    select created_at, session_id, lcp::text, cls::text, inp::text, fcp::text, ttfb::text, tbt::text, load::text, tti::text, dcl::text, resource_count::text
    from public.vitals where website_url = ${siteUrl} and created_at < ${until}`;
  const customs = await sql<OldCustom[]>`
    select event_id, created_at, event_name, property_name, property_value, session_id, page_url
    from public.custom_events where website_url = ${siteUrl} and created_at < ${until} order by created_at`;

  console.log(
    `site ${siteUrl} (#${siteId}), until ${until.toISOString()}${dryRun ? ", DRY RUN" : ""}`
  );
  console.log(
    `old rows: sessions ${sessions.length}, page_views ${pageViews.length}, vitals ${vitals.length}, custom_events ${customs.length}`
  );

  // -------------------------------------------------------------- build
  const bySession = new Map<string, OldSession>(
    sessions.map((s) => [s.session_id, s])
  );
  const pvBySession = new Map<string, OldPageView[]>();
  for (const pv of pageViews) {
    const list = pvBySession.get(pv.session_id) ?? [];
    list.push(pv);
    pvBySession.set(pv.session_id, list);
  }
  let orphanPageViews = 0;
  const rows: EventRow[] = [];
  const runAt = new Date();

  type SessionCtx = ReturnType<typeof sessionContext>;
  function sessionContext(
    sessionKey: string,
    s: OldSession | undefined,
    firstPv: OldPageView | undefined
  ) {
    const firstUrl = firstPv?.page ?? "";
    const rawRef =
      firstPv?.referrer &&
      firstPv.referrer !== "Direct" &&
      firstPv.referrer !== "Unknown"
        ? firstPv.referrer
        : undefined;
    const ref = parseReferrer(rawRef, hostnames);
    const utm = parseUtm(firstUrl);
    const { source, channel } = classify(ref.referrer, utm);
    return {
      sessionId: idFromText("session", sessionKey),
      clientId: s?.client_id ?? sessionKey,
      ref,
      utm,
      source,
      channel,
      country: countryCode(s?.country ?? null),
      city: s?.city && s.city !== "Unknown" ? cleanText(s.city, 128) : "",
      device: device(s?.device ?? null),
      browser: browser(s?.browser ?? null),
      os: os(s?.operating_system ?? null),
      lastPageviewId: idFromText("pageview", sessionKey),
      lastPageviewTs: s?.created_at ?? runAt,
      pageviews: [] as { ts: Date; id: bigint }[],
      seq: 0,
    };
  }

  function base(
    ctx: SessionCtx,
    ts: Date,
    pageviewId: bigint,
    page: { hostname: string; path: string; query: string }
  ): EventRow {
    ctx.seq += 1;
    return {
      site_id: siteId,
      ts,
      received_at: runAt,
      seq: ctx.seq,
      event: "pageview",
      name: "",
      visitor_id: legacyVisitorId(salt, utcDay(ts), siteId, ctx.clientId),
      session_id: ctx.sessionId,
      user_hash: BigInt(0),
      pageview_id: pageviewId,
      hostname: page.hostname,
      path: page.path,
      title: "",
      query: page.query,
      referrer: ctx.ref.referrer,
      referrer_url: ctx.ref.referrer_url,
      source: ctx.source,
      channel: ctx.channel,
      ...ctx.utm,
      country: ctx.country,
      region: "",
      city: ctx.city,
      device: ctx.device,
      browser: ctx.browser,
      browser_major: 0,
      browser_version: "",
      os: ctx.os,
      os_version: "",
      screen_width: 0,
      screen_height: 0,
      language: "",
      engaged_ms: 0,
      scroll_depth: 0,
      props: {},
      revenue: null,
      lcp: null,
      cls: null,
      inp: null,
      fcp: null,
      ttfb: null,
      dcl: null,
      load: null,
      tti: null,
      tbt: null,
      resources: null,
      lcp_target: null,
      inp_target: null,
      suspect: false,
      ingest_version: 0,
    };
  }

  const contexts = new Map<string, SessionCtx>();
  const allSessionKeys = new Set<string>([
    ...bySession.keys(),
    ...pvBySession.keys(),
  ]);
  for (const key of allSessionKeys) {
    const s = bySession.get(key);
    const pvs = pvBySession.get(key) ?? [];
    if (!s) orphanPageViews += pvs.length;
    const ctx = sessionContext(key, s, pvs[0]);
    contexts.set(key, ctx);
    for (const pv of pvs) {
      const page = parsePageUrl(pv.page) ?? {
        hostname: hostnames[0] ?? "",
        path: cleanText(pv.pathname || "/", 2048),
        query: "",
      };
      const pageviewId = idFromText("pageview", `${key}:${pv.id}`);
      rows.push(base(ctx, pv.created_at, pageviewId, page));
      ctx.pageviews.push({ ts: pv.created_at, id: pageviewId });
      ctx.lastPageviewId = pageviewId;
      ctx.lastPageviewTs = pv.created_at;
    }
  }

  const lastPage = (ctx: SessionCtx) => {
    const last = rows.findLast(
      (r) => r.session_id === ctx.sessionId && r.event === "pageview"
    );
    return last
      ? { hostname: last.hostname, path: last.path, query: last.query }
      : { hostname: hostnames[0] ?? "", path: "/", query: "" };
  };

  let engagementRows = 0;
  for (const s of sessions) {
    const ctx = contexts.get(s.session_id);
    if (!ctx) continue;
    const duration = Number(s.session_duration ?? 0);
    if (!Number.isFinite(duration) || duration <= 0) continue;
    const row = base(
      ctx,
      new Date(ctx.lastPageviewTs.getTime() + 1000),
      ctx.lastPageviewId,
      lastPage(ctx)
    );
    rows.push({
      ...row,
      event: "engagement",
      engaged_ms: Math.min(Math.round(duration), 6 * 3_600_000),
    });
    engagementRows += 1;
  }

  let vitalsRows = 0;
  const num = (v: string | null | undefined) => {
    const n = Number(v);
    return v !== null && v !== undefined && Number.isFinite(n) && n > 0
      ? n
      : null;
  };
  for (const v of vitals) {
    const ctx = v.session_id ? contexts.get(v.session_id) : undefined;
    if (!ctx) continue;
    const row = base(ctx, v.created_at, ctx.lastPageviewId, lastPage(ctx));
    const lcp = num(v.lcp);
    const cls =
      v.cls !== null && Number.isFinite(Number(v.cls)) && lcp !== null
        ? Number(v.cls)
        : null;
    rows.push({
      ...row,
      event: "vitals",
      lcp,
      cls,
      inp: num(v.inp),
      fcp: num(v.fcp),
      ttfb: num(v.ttfb),
      tbt: num(v.tbt),
      load: num(v.load),
      tti: num(v.tti),
      dcl: num(v.dcl),
      resources:
        num(v.resource_count) !== null
          ? Math.min(Math.round(Number(v.resource_count)), 32767)
          : null,
    });
    vitalsRows += 1;
  }

  const byEvent = new Map<string, OldCustom[]>();
  for (const c of customs) {
    const list = byEvent.get(c.event_id) ?? [];
    list.push(c);
    byEvent.set(c.event_id, list);
  }
  let customRows = 0;
  let customOrphans = 0;
  for (const [, parts] of byEvent) {
    const first = parts[0];
    if (!first) continue;
    const ctx = contexts.get(first.session_id);
    if (!ctx) {
      customOrphans += 1;
      continue;
    }
    const ts = parts.reduce(
      (m, p) => (p.created_at < m ? p.created_at : m),
      first.created_at
    );
    const before = ctx.pageviews.filter((p) => p.ts <= ts);
    const pageviewId = before.length
      ? (before[before.length - 1] as { id: bigint }).id
      : (ctx.pageviews[0]?.id ?? ctx.lastPageviewId);
    const raw: Record<string, unknown> = {};
    for (const p of parts)
      if (p.property_name !== null && p.property_value !== null)
        raw[p.property_name] = p.property_value;
    const { props, revenue } = normaliseProps(raw);
    const page = {
      hostname: hostnames[0] ?? "",
      path: cleanText(first.page_url || "/", 2048),
      query: "",
    };
    rows.push({
      ...base(ctx, ts, pageviewId, page),
      event: "custom",
      name: cleanText(first.event_name, 64),
      props,
      revenue,
    });
    customRows += 1;
  }

  rows.sort((a, b) => a.ts.getTime() - b.ts.getTime() || a.seq - b.seq);

  console.log(
    `built rows: pageview ${rows.filter((r) => r.event === "pageview").length}, engagement ${engagementRows}, vitals ${vitalsRows}, custom ${customRows} (custom groups ${byEvent.size}) = ${rows.length}`
  );
  console.log(
    `orphans: page_views without a session ${orphanPageViews}, custom events without a session ${customOrphans}`
  );
  console.log(
    "unmapped countries:",
    unmappedCountries.size ? JSON.stringify([...unmappedCountries]) : "none"
  );
  const countryTally = new Map<string, number>();
  for (const r of rows)
    if (r.event === "pageview")
      countryTally.set(
        r.country || "''",
        (countryTally.get(r.country || "''") ?? 0) + 1
      );
  console.log(
    "pageview countries:",
    JSON.stringify([...countryTally].sort((a, b) => b[1] - a[1]).slice(0, 12))
  );

  if (dryRun) return;

  // ---------------------------------------------------------------- write
  const wiped =
    await sql`delete from analytics.events where site_id = ${siteId} and ingest_version = 0 and ts < ${until}`;
  console.log(`wiped ${wiped.count} previous backfill rows`);
  const columns = EVENT_COLUMNS as unknown as string[];
  // 53 columns per row: 1,000 rows stays under Postgres's 65,535 parameters per statement
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows
      .slice(i, i + 1000)
      .map((r) => ({ ...r, props: sql.json(r.props) })) as Record<
      string,
      unknown
    >[];
    await sql`insert into analytics.events ${sql(chunk, ...columns)}`;
    console.log(`inserted ${Math.min(i + 1000, rows.length)}/${rows.length}`);
  }
  const [check] = await sql<{ n: number; pv: number }[]>`
    select count(*)::int as n, count(*) filter (where event = 'pageview')::int as pv
    from analytics.events where site_id = ${siteId} and ingest_version = 0`;
  console.log(
    `analytics.events now holds ${check?.n} backfilled rows for the site, ${check?.pv} pageviews (old page_views: ${pageViews.length})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
