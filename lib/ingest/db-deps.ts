import "server-only";
import { sql, withTimeout } from "@/lib/db";
import type { CrawlerDayRow } from "./bots";
import type { LogEntry } from "./collect";
import { EVENT_COLUMNS, type EventRow } from "./rows";

/** The database side of the collect pipeline; the route and the integration test share it. */
export async function insertEvents(rows: EventRow[]) {
  await withTimeout(2000, async (tx) => {
    const values = rows.map((r) => ({
      ...r,
      props: tx.json(r.props),
    })) as Record<string, unknown>[];
    const columns = EVENT_COLUMNS as unknown as string[];
    await tx`insert into analytics.events ${tx(values, ...columns)}`;
  });
}

export async function logIngest(entries: LogEntry[]) {
  await sql`insert into analytics.ingest_log ${sql(entries, "hostname", "site_id", "stage", "detail")}`;
}

export async function rememberUser(
  siteId: number,
  userHash: bigint,
  uid: string
) {
  await sql`
    insert into analytics.identified_users (site_id, user_hash, user_id, last_seen)
    values (${siteId}, ${userHash}, ${uid}, now())
    on conflict (site_id, user_hash) do update set user_id = excluded.user_id, last_seen = now()`;
}

/** /api/bots: crawler hits folded per day; a repeat adds to the counter (D-018). */
export async function upsertCrawlerDays(rows: CrawlerDayRow[]) {
  await withTimeout(2000, async (tx) => {
    await tx`
      insert into analytics.crawler_days ${tx(
        rows as unknown as Record<string, unknown>[],
        "site_id",
        "day",
        "crawler",
        "family",
        "path",
        "hits",
        "last_status",
        "last_seen"
      )}
      on conflict (site_id, day, crawler, path) do update set
        hits        = analytics.crawler_days.hits + excluded.hits,
        family      = excluded.family,
        last_status = case when excluded.last_seen >= analytics.crawler_days.last_seen
                           then excluded.last_status else analytics.crawler_days.last_status end,
        last_seen   = greatest(analytics.crawler_days.last_seen, excluded.last_seen)`;
  });
}
