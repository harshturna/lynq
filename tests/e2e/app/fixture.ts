// The app e2e fixture (TICKET-047): one site owned by the owner user with
// forty days of generated traffic, a KPI goal and a few rows from the last
// minutes for Realtime. Re-runnable: the site is recreated on every run.

import { createHash } from "node:crypto";
import postgres from "postgres";
import { EVENT_COLUMNS, type EventRow } from "@/lib/ingest/rows";
import {
  CRAWLER_DAY_COLUMNS,
  generateCrawlerDays,
} from "../../../scripts/seed/crawlers";
import { generate } from "../../../scripts/seed/generate";
import { seedNotes } from "../../../scripts/seed/notes";
import { POSTGREST_URL, USERS } from "./env.mjs";

export const SITE = {
  name: "E2E fixture",
  url: "e2e.lynq.test",
  slug: "e2e-lynq-test",
  hostname: "e2e.lynq.test",
};
export const GOAL = { name: "Signup", match: "signup", target: 400 };
export const SEED = { days: 40, visitorsPerDay: 25, seed: 7 };
export const LIVE_ROWS = 12;
/** A key with the read and notes scopes for the MCP spec; fixed so the spec can send it. */
export const E2E_KEY = {
  token: "lynq_sk_e2e0000000000000000000000000000000000000000000000",
  name: "E2E agent",
};

export async function createFixture(databaseUrl: string): Promise<{
  siteId: number;
  rows: number;
}> {
  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    types: { bigint: postgres.BigInt },
  });
  try {
    const old = await sql<{ id: number }[]>`
      select id from public.websites where slug = ${SITE.slug}`;
    for (const w of old) {
      await sql`delete from analytics.events where site_id = ${w.id}`;
      await sql`delete from public.websites where id = ${w.id}`;
    }
    const [site] = await sql<{ id: number }[]>`
      insert into public.websites (name, url, user_id, slug)
      values (${SITE.name}, ${SITE.url}, ${USERS.owner.id}::uuid, ${SITE.slug})
      returning id`;
    const siteId = Number(site.id);
    await sql`insert into analytics.site_hostnames (site_id, hostname)
      values (${siteId}, ${SITE.hostname})`;
    const [goal] = await sql<{ id: number }[]>`
      insert into public.goals (site_id, name, kind, match, target)
      values (${siteId}, ${GOAL.name}, 'event', ${GOAL.match}, ${GOAL.target})
      returning id`;
    await sql`insert into analytics.site_settings (site_id, timezone, kpi_goal_id)
      values (${siteId}, 'UTC', ${Number(goal.id)})`;

    const { rows } = generate({
      siteId,
      hostname: SITE.hostname,
      secret: "e2e",
      ...SEED,
    });
    // Realtime needs traffic from the last half hour: clone the newest rows
    // into fresh sessions dated within the last twenty minutes.
    const now = Date.now();
    const live: EventRow[] = rows.slice(-LIVE_ROWS).map((r, i) => {
      const at = new Date(now - (LIVE_ROWS - i) * 90_000);
      const bump = 7_000_003n * BigInt(i + 1);
      return {
        ...r,
        ts: at,
        received_at: at,
        visitor_id: r.visitor_id + bump,
        session_id: r.session_id + bump,
        pageview_id: r.pageview_id + bump,
      };
    });
    const all = [...rows, ...live];
    for (let i = 0; i < all.length; i += 1000) {
      const chunk = all
        .slice(i, i + 1000)
        .map((r) => ({ ...r, props: sql.json(r.props) })) as unknown as Record<
        string,
        unknown
      >[];
      await sql`insert into analytics.events ${sql(chunk, ...([...EVENT_COLUMNS] as string[]))}`;
    }
    // Crawler hits for the Bots screen (D-018), as the middleware would have reported them.
    const crawlerRows = generateCrawlerDays({
      siteId,
      days: SEED.days,
      seed: SEED.seed,
    });
    await sql`insert into analytics.crawler_days ${sql(
      crawlerRows as unknown as Record<string, unknown>[],
      ...([...CRAWLER_DAY_COLUMNS] as string[])
    )}`;
    await sql`insert into analytics.api_keys (site_id, name, scopes, token_hash, prefix)
      values (${siteId}, ${E2E_KEY.name}, ${["read", "notes"]}, ${createHash("sha256").update(E2E_KEY.token, "utf8").digest()}, ${E2E_KEY.token.slice(0, 16)})`;
    // Notes at the generator's launch spikes (TICKET-076).
    const notes = seedNotes({ siteId, days: SEED.days });
    await sql`insert into public.notes ${sql(notes, "site_id", "at", "text", "author")}`;
    // Fresh statistics and the daily rollup, as production has them.
    await sql`analyze analytics.events`;
    await sql`select analytics.rollup_refresh()`;
    // PostgREST may have started before the schema existed (CI); reload it.
    await sql`notify pgrst, 'reload schema'`;
    return { siteId, rows: all.length };
  } finally {
    await sql.end();
  }
}

/** Waits until PostgREST answers for the websites table (401 for anon is fine). */
export async function waitForPostgrest(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${POSTGREST_URL}/websites?select=id&limit=1`);
      if (res.status !== 404 && res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`PostgREST at ${POSTGREST_URL} did not become ready`);
}
