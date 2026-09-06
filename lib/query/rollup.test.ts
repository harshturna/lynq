import { describe, expect, it } from "vitest";
import type { QueryContext } from "./primitives";
import {
  rollupApplies,
  rollupBreakdownQuery,
  rollupSummaryQuery,
  rollupTimeseriesApplies,
  rollupTimeseriesQuery,
} from "./rollup";

const ctx: QueryContext = {
  siteId: 7,
  range: {
    from: new Date("2026-08-01T04:00:00Z"),
    toExclusive: new Date("2026-08-31T15:00:00Z"),
  },
  timezone: "America/Toronto",
  filters: [],
};
const goal = { id: 3, kind: "event" as const, match: "signup" };

describe("rollupApplies", () => {
  it("takes one rolled dimension, rolled metrics, no filters, a whole UTC day", () => {
    expect(rollupApplies(ctx, "path", ["visitors", "bounce_rate"])).toBe(true);
    expect(
      rollupApplies(ctx, "site", ["visitors", "revenue", "payments"])
    ).toBe(true);
    expect(
      rollupApplies(ctx, "entry_channel", [
        "visitors",
        { kind: "conversion", goal },
      ])
    ).toBe(true);
    expect(rollupApplies(ctx, ["browser", "os"], ["visitors"])).toBe(false);
    expect(rollupApplies(ctx, "event_name", ["visitors"])).toBe(false);
    expect(rollupApplies(ctx, "path", ["visitors", "last_seen"])).toBe(false);
    expect(
      rollupApplies(ctx, "path", ["visitors"], { orderBy: "last_seen" })
    ).toBe(false);
    expect(rollupApplies(ctx, "path", ["visitors"], { propKey: "plan" })).toBe(
      false
    );
    expect(
      rollupApplies(
        {
          ...ctx,
          filters: [{ dimension: "country", op: "is", values: ["CA"] }],
        },
        "path",
        ["visitors"]
      )
    ).toBe(false);
    expect(
      rollupApplies({ ...ctx, includeSuspect: true }, "path", ["visitors"])
    ).toBe(false);
    expect(
      rollupApplies(
        {
          ...ctx,
          range: {
            from: new Date("2026-08-01T04:00:00Z"),
            toExclusive: new Date("2026-08-01T23:00:00Z"),
          },
        },
        "path",
        ["visitors"]
      )
    ).toBe(false);
  });
});

describe("rollupBreakdownQuery", () => {
  it("reads the rolled days, both edges, the identified count and the goal rows", () => {
    const { text, params } = rollupBreakdownQuery(
      ctx,
      "entry_channel",
      [
        "visitors",
        "sessions",
        { kind: "goal_completions", goal },
        { kind: "conversion", goal },
      ],
      { limit: 20 }
    );
    expect(text).toContain("from analytics.rollup_daily r");
    expect(text).toContain("analytics.rollup_window($1, $2, $3, $5)"); // head: from → first UTC midnight
    expect(text).toContain("rollup_window($1, $2, b.tail_from, $4)"); // tail
    expect(text).toContain("rollup_window($1, $2, $3, $4, true)"); // identified users over the range
    expect(text).toContain("g0h as materialized");
    expect(text).toContain("(s.entry ->> 'channel')::text as value");
    expect(text).toContain("where true"); // '' is Direct
    expect(text).toMatch(/order by visitors desc nulls last, a\.value/);
    const placeholders = new Set(text.match(/\$\d+/g));
    expect(placeholders.size).toBe(params.length);
    expect(params[4]).toEqual(new Date("2026-08-02T00:00:00Z"));
    expect(params[5]).toEqual(new Date("2026-08-31T00:00:00Z"));
  });

  it("drops the empty value for row dimensions and UTM fields", () => {
    expect(rollupBreakdownQuery(ctx, "path", ["visitors"]).text).toContain(
      "where a.value <> ''"
    );
    expect(
      rollupBreakdownQuery(ctx, "entry_utm_campaign", ["sessions"]).text
    ).toContain("where a.value <> ''");
    expect(rollupBreakdownQuery(ctx, "path", ["sessions"]).text).not.toContain(
      "ident"
    );
    // a row dimension counts identified users from the rows alone
    expect(rollupBreakdownQuery(ctx, "path", ["visitors"]).text).toContain(
      "select e.path::text as value, count(distinct e.visitor_id)::int as visitors_ident"
    );
    expect(rollupSummaryQuery(ctx, ctx.range).text).toContain("where true");
  });
});

describe("rollupTimeseries", () => {
  const utc = { ...ctx, timezone: "UTC" };
  it("applies to UTC sites at day or coarser, never to hours or local midnights", () => {
    expect(rollupTimeseriesApplies(utc, "visitors", "day")).toBe(true);
    expect(rollupTimeseriesApplies(utc, "sessions", "month")).toBe(true);
    expect(rollupTimeseriesApplies(utc, "visitors", "hour")).toBe(false);
    expect(rollupTimeseriesApplies(ctx, "visitors", "day")).toBe(false); // Toronto midnights
    expect(
      rollupTimeseriesApplies(
        { ...utc, filters: [{ dimension: "path", op: "is", values: ["/"] }] },
        "visitors",
        "day"
      )
    ).toBe(false);
  });
  it("sums the rolled days per bucket, one window per unrolled day, identified per bucket", () => {
    const { text, params } = rollupTimeseriesQuery(utc, "visitors", "week");
    expect(text).toContain("r.dimension = 'site'");
    expect(text).toContain("generate_series(b.tail_from");
    expect(text).toContain(
      "count(distinct e.visitor_id)::int as visitors_ident"
    );
    expect(text).toContain("date_trunc($6, day at time zone $7)");
    expect(new Set(text.match(/\$\d+/g)).size).toBe(params.length);
    expect(rollupTimeseriesQuery(utc, "pageviews", "day").text).not.toContain(
      "ident"
    );
  });
});
