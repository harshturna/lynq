import { describe, expect, it } from "vitest";
import { Query } from "./builder";
import { compileFilters, IDENTITY_WHERE } from "./filters";
import {
  breakdownQuery,
  type QueryContext,
  rowsQuery,
  summaryQueries,
  timeseriesQuery,
} from "./primitives";

const ctx: QueryContext = {
  siteId: 31,
  range: {
    from: new Date("2026-09-01T00:00:00Z"),
    toExclusive: new Date("2026-09-02T00:00:00Z"),
  },
  timezone: "UTC",
  filters: [],
};

describe("compileFilters", () => {
  it("ORs within a dimension and ANDs across, with every value as a parameter", () => {
    const q = new Query();
    const c = compileFilters(q, [
      { dimension: "country", op: "is", values: ["CA", "US"] },
      { dimension: "device", op: "is_not", values: ["mobile"] },
    ]);
    expect(c.rowWhere).toBe(
      "(e.country = any($1::text[])) and (not (e.device = any($2::text[])))"
    );
    expect(q.params).toEqual([["CA", "US"], ["mobile"]]);
    expect(c.hasSession).toBe(false);
  });
  it("contains uses an escaped ilike", () => {
    const q = new Query();
    const c = compileFilters(q, [
      { dimension: "path", op: "contains", values: ["100%"] },
    ]);
    expect(c.rowWhere).toContain("ilike $1 escape");
    expect(q.params).toEqual(["%100\\%%"]);
  });
  it("props use @> and ?, never ->> in a where clause", () => {
    const q = new Query();
    const c = compileFilters(q, [
      { dimension: "prop:plan", op: "is", values: ["pro"] },
    ]);
    expect(c.rowWhere).toContain(
      "e.props @> jsonb_build_object($1::text, $2::text)"
    );
    expect(c.rowWhere).not.toContain("->>");
  });
  it("session dimensions become a having on the session CTE", () => {
    const q = new Query();
    const c = compileFilters(q, [
      { dimension: "entry_path", op: "is", values: ["/pricing"] },
      { dimension: "bounced", op: "is", values: ["true"] },
    ]);
    expect(c.rowWhere).toBe("true");
    expect(c.hasSession).toBe(true);
    expect(c.sessionHaving).toBe(
      "(s.entry_path = any($1::text[])) and (s.bounced = $2)"
    );
  });
  it("rejects unknown dimensions", () => {
    expect(() =>
      compileFilters(new Query(), [
        { dimension: "drop table", op: "is", values: ["x"] },
      ])
    ).toThrow();
  });
  it("names the anonymous sentinel exclusion for identity queries", () => {
    expect(IDENTITY_WHERE).toBe("e.user_hash <> 0");
  });
});

describe("query shapes", () => {
  it("never uses between and always scopes by site, half-open range and suspect", () => {
    const all = [
      timeseriesQuery(ctx, "pageviews", "day"),
      timeseriesQuery(ctx, "bounce_rate", "day"),
      breakdownQuery(ctx, "path", "pageviews"),
      breakdownQuery(ctx, "entry_path", "sessions"),
      breakdownQuery(ctx, "country", "bounce_rate"),
      breakdownQuery(ctx, "prop:plan", "custom_events"),
      breakdownQuery(ctx, "prop_key", "custom_events"),
      summaryQueries(ctx).rows,
      summaryQueries(ctx).sessions,
      rowsQuery(ctx, "events"),
      rowsQuery(ctx, "sessions"),
      rowsQuery(ctx, "session", { visitorId: BigInt(1), sessionId: BigInt(2) }),
    ];
    for (const c of all) {
      expect(c.text.toLowerCase()).not.toContain("between");
      expect(c.text).toMatch(
        /e\.ts >= \$\d+ and e\.ts < \$\d+|e\.session_id = \$\d+/
      );
      expect(c.text).toContain("not e.suspect");
      expect(c.params.length).toBeGreaterThan(0);
    }
  });
  it("joins the session CTE only when a session filter exists, and materialises it", () => {
    const plain = timeseriesQuery(ctx, "pageviews", "day");
    expect(plain.text).not.toContain("sess");
    const filtered = timeseriesQuery(
      {
        ...ctx,
        filters: [{ dimension: "entry_path", op: "is", values: ["/"] }],
      },
      "pageviews",
      "day"
    );
    expect(filtered.text).toContain("sess as materialized");
    expect(filtered.text).toContain(
      "join sess s using (visitor_id, session_id)"
    );
  });
  it("buckets session metrics by session start in the site timezone", () => {
    const c = timeseriesQuery(
      { ...ctx, timezone: "America/Winnipeg" },
      "sessions",
      "day"
    );
    expect(c.text).toContain("s.started at time zone");
    expect(c.params).toContain("America/Winnipeg");
  });
  it("refuses a session metric on a page-level dimension", () => {
    expect(() => breakdownQuery(ctx, "path", "bounce_rate")).toThrow();
    expect(() => breakdownQuery(ctx, "prop_value", "pageviews")).toThrow();
  });
});
