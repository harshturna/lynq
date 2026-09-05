import "server-only";
import { sql, withTimeout } from "@/lib/db";
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
