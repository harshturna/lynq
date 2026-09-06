/**
 * explain (analyze, buffers) for the Overview's heaviest statements on the
 * production pooler, to separate scan from aggregation (TICKET-049).
 *   set -a; . ./.env; set +a; node --conditions=react-server --import tsx scripts/explain-prod.mts
 */
import { sql } from "@/lib/db";
import { buildContext } from "@/lib/query/authorize";
import { breakdownMultiQuery } from "@/lib/query/breakdown";
import { summaryQueries, timeseriesQuery } from "@/lib/query/primitives";
import { rollupApplies, rollupBreakdownQuery } from "@/lib/query/rollup";

const [{ site_id }] = await sql<
  { site_id: number }[]
>`select site_id from analytics.site_hostnames where hostname = 'aivia.byharsh.com' limit 1`;
const site = {
  siteId: Number(site_id),
  timezone: "UTC",
  kpiGoalId: null,
  breakpoints: [],
  shortcuts: true,
};
const ctx = {
  ...buildContext(site, { range: "last_12mo" }),
  timeoutMs: 60_000,
};
const goal = { id: 1, kind: "event" as const, match: "signup" };
const route = (dim: string, m: never[], o: { limit: number }) =>
  rollupApplies(ctx, dim, m, o)
    ? rollupBreakdownQuery(ctx, dim, m, o)
    : breakdownMultiQuery(ctx, dim, m, o);
const cases: Record<string, { text: string; params: unknown[] }> = {
  pages_multi: breakdownMultiQuery(
    ctx,
    "path",
    ["visitors", "pageviews", "bounce_rate", "engaged_time"],
    { limit: 200 }
  ) as never,
  sources_multi: breakdownMultiQuery(
    ctx,
    "entry_channel",
    ["visitors", "sessions", "bounce_rate"],
    { limit: 200 }
  ) as never,
  timeseries: timeseriesQuery(ctx, "visitors", "day") as never,
};
const sums = summaryQueries(ctx, ctx.range) as never as
  | Record<string, { text: string; params: unknown[] }>
  | { text: string; params: unknown[] }[];
Object.assign(
  cases,
  Array.isArray(sums)
    ? Object.fromEntries(sums.map((s, i) => [`summary_${i}`, s]))
    : Object.fromEntries(
        Object.entries(sums).map(([k, v]) => [`summary_${k}`, v])
      )
);
for (const [name, c] of Object.entries(cases)) {
  const compiled = c as unknown as {
    text?: string;
    sql?: string;
    params?: unknown[];
    values?: unknown[];
  };
  const text = compiled.text ?? compiled.sql ?? "";
  const params = compiled.params ?? compiled.values ?? [];
  const rows = await sql.unsafe(
    `explain (analyze, buffers, format text) ${text}`,
    params as never[]
  );
  const lines = rows.map((r: Record<string, string>) => Object.values(r)[0]);
  console.log(`\n=== ${name}`);
  for (const l of lines)
    if (
      /Execution Time|Planning Time|^\s*(->\s+)?(Seq Scan|Index Scan|Index Only Scan|Bitmap Heap Scan|HashAggregate|GroupAggregate|Sort|Hash Join|Nested Loop|CTE Scan|WindowAgg|Materialize|Limit)/.test(
        l
      )
    )
      console.log(l.slice(0, 170));
}
await sql.end();
