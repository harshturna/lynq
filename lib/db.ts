import "server-only";
import postgres from "postgres";

/**
 * The one connection to the analytics schema (design §14). Used by ingest and
 * by lib/query; nothing else touches `analytics`.
 *
 * Transaction pooler, so `prepare: false`. `max: 1` because each warm Vercel
 * instance would otherwise hold ten of the instance's sixty connections.
 */
const url = process.env.LYNQ_DB_POOLER_URL;
if (!url) throw new Error("LYNQ_DB_POOLER_URL is not set");
{
  const parsed = new URL(url);
  const isPooler =
    parsed.port === "6543" || parsed.hostname.includes("pooler.supabase.com");
  if (!isPooler && process.env.NODE_ENV === "production") {
    throw new Error(
      "LYNQ_DB_POOLER_URL must point at the transaction pooler (port 6543)"
    );
  }
}

export const sql = postgres(url, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * Run `fn` in a transaction with a statement timeout that dies with the
 * transaction, which is the only safe way to set one through a pooler.
 */
export function withTimeout<T>(
  ms: number,
  fn: (tx: postgres.TransactionSql) => Promise<T>
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx.unsafe(`set local statement_timeout = ${Math.floor(ms)}`);
    return fn(tx);
  }) as Promise<T>;
}
