/**
 * Times each Overview primitive on the production pooler, sequentially, for
 * three ranges. Run with the pooler URL in the environment:
 *   set -a; . ./.env; set +a; node --conditions=react-server --import tsx scripts/measure-prod.mts
 * The integration budget harness measures the same calls on a local fixture;
 * this is the number the rollup decision (TICKET-049) is made on.
 */
import { sql } from "@/lib/db";
import { buildContext } from "@/lib/query/authorize";
import * as q from "@/lib/query/run";

const [{ site_id }] = await sql<
  { site_id: number }[]
>`select site_id from analytics.site_hostnames where hostname = 'aivia.byharsh.com' limit 1`;
const site = {
  siteId: Number(site_id),
  timezone: "UTC",
  kpiGoalId: null,
  breakpoints: [640, 1024, 1280],
  shortcuts: true,
};
for (const range of ["last_30d", "last_90d", "last_12mo"] as const) {
  const ctx = {
    ...buildContext(site, { range, compare: "previous_period" }),
    timeoutMs: 60_000,
  };
  const cases: Record<string, () => Promise<unknown>> = {
    summary: () => q.summary(ctx),
    timeseries: () => q.timeseries(ctx, "visitors", ctx.granularity),
    pages_multi: () =>
      q.breakdownMulti(
        ctx,
        "path",
        ["visitors", "pageviews", "bounce_rate", "engaged_time"],
        { limit: 200 }
      ),
    sources_multi: () =>
      q.breakdownMulti(
        ctx,
        "entry_channel",
        ["visitors", "sessions", "bounce_rate", "revenue"],
        { limit: 200 }
      ),
    locations_multi: () =>
      q.breakdownMulti(
        ctx,
        "country",
        ["visitors", "pageviews", "bounce_rate"],
        { limit: 200 }
      ),
    devices: () => q.breakdownMulti(ctx, "device", ["visitors"], { limit: 6 }),
    vitals: () => q.vitals(ctx),
    pages_single: () => q.breakdown(ctx, "path", "pageviews", { limit: 200 }),
  };
  const out: Record<string, number> = {};
  for (const [name, fn] of Object.entries(cases)) {
    const t0 = performance.now();
    try {
      await fn();
      out[name] = Math.round(performance.now() - t0);
    } catch (e) {
      out[name] = -1;
      console.error(name, (e as Error).message);
    }
  }
  console.log(range, JSON.stringify(out));
}
await sql.end();
