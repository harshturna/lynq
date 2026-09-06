import { describe, expect, it } from "vitest";
import { EVENT_COLUMNS } from "../../lib/ingest/rows";
import { generate, SEED_INGEST_VERSION } from "./generate";

const opts = {
  siteId: 31,
  hostname: "aivia.byharsh.com",
  days: 14,
  visitorsPerDay: 20,
  seed: 7,
  secret: "test-secret",
  until: new Date("2026-09-05T12:00:00Z"),
};

describe("seed generator", () => {
  const { rows, stats } = generate(opts);

  it("is deterministic for a seed and writes only the seed marker", () => {
    const again = generate(opts);
    expect(again.stats).toEqual(stats);
    expect(again.rows[100]).toEqual(rows[100]);
    expect(
      rows.every((r) => r.ingest_version === SEED_INGEST_VERSION && !r.suspect)
    ).toBe(true);
    expect(generate({ ...opts, seed: 8 }).stats.rows).not.toBe(stats.rows);
  });

  it("stays inside the range and grows through it", () => {
    const first = new Date("2026-08-22T00:00:00Z");
    expect(rows.every((r) => r.ts >= first && r.ts < opts.until)).toBe(true);
    const perDay = new Map<string, number>();
    for (const r of rows)
      if (r.event === "pageview")
        perDay.set(
          r.ts.toISOString().slice(0, 10),
          (perDay.get(r.ts.toISOString().slice(0, 10)) ?? 0) + 1
        );
    expect(perDay.size).toBe(15); // 14 full days plus today up to noon
    expect(stats.firstDay).toBe("2026-08-22");
    expect(stats.lastDay).toBe("2026-09-05");
  });

  it("shapes sessions the way the query layer expects", () => {
    const bySession = new Map<bigint, typeof rows>();
    for (const r of rows) {
      const list = bySession.get(r.session_id) ?? [];
      list.push(r);
      bySession.set(r.session_id, list);
    }
    expect(bySession.size).toBe(stats.sessions);
    // returning visitors: more sessions than visitors, but most visit once
    expect(new Set(rows.map((r) => r.visitor_id)).size).toBe(stats.visitors);
    expect(stats.visitors).toBeLessThan(stats.sessions);
    expect(stats.visitors).toBeGreaterThan(stats.sessions * 0.7);
    // an identified user's id is the user hash, so it holds across days
    for (const r of rows)
      if (r.user_hash !== BigInt(0)) expect(r.visitor_id).toBe(r.user_hash);
    for (const list of bySession.values()) {
      // seq increases with time within a session; one visitor per session
      expect(list.map((r) => r.seq)).toEqual(list.map((_, i) => i + 1));
      expect(new Set(list.map((r) => r.visitor_id)).size).toBe(1);
      expect(list[0].event).toBe("pageview");
      // entry referrer only on the first pageview, later pageviews are internal
      const pvs = list.filter((r) => r.event === "pageview");
      for (const pv of pvs.slice(1)) expect(pv.referrer).toBe("");
    }
    const bounce = stats.bounced / stats.sessions;
    expect(bounce).toBeGreaterThan(0.1);
    expect(bounce).toBeLessThan(0.35);
    expect(stats.pageviews / stats.sessions).toBeGreaterThan(1.8);
  });

  it("uses only values the events table accepts", () => {
    const events = new Set([
      "pageview",
      "engagement",
      "custom",
      "vitals",
      "identify",
    ]);
    for (const r of rows) {
      expect(events.has(r.event)).toBe(true);
      for (const c of EVENT_COLUMNS) expect(r[c]).not.toBeUndefined();
      if (r.event === "custom") expect(r.name).not.toBe("");
      if (r.revenue !== null) expect(r.event).toBe("custom");
    }
    const channels = new Set(
      rows.filter((r) => r.seq === 1).map((r) => r.channel)
    );
    expect(channels).toContain("Organic Search");
    expect(channels).toContain("Email");
    expect(channels).toContain("Paid");
    expect(channels).toContain("AI");
  });

  it("scrolls long-form pages deeper than app screens, so read-through separates", () => {
    const byKind = { long: [0, 0], marketing: [0, 0], app: [0, 0] };
    for (const r of rows) {
      if (r.event !== "engagement") continue;
      const kind =
        r.path.startsWith("/docs") || r.path.startsWith("/blog")
          ? "long"
          : r.path.startsWith("/dashboard") ||
              r.path === "/login" ||
              r.path === "/signup"
            ? "app"
            : "marketing";
      byKind[kind][1] += 1;
      if (r.scroll_depth >= 75 && r.engaged_ms >= 10_000) byKind[kind][0] += 1;
    }
    const share = (k: keyof typeof byKind) =>
      byKind[k][1] ? byKind[k][0] / byKind[k][1] : 0;
    expect(share("long")).toBeGreaterThan(share("marketing"));
    expect(share("marketing")).toBeGreaterThan(share("app"));
    expect(share("long")).toBeGreaterThan(0.3);
    expect(share("app")).toBeLessThan(0.2);
    expect(stats.revenue).toBeGreaterThan(0);
    expect(stats.identify).toBeGreaterThan(0);
    expect(
      rows.some((r) => r.event === "vitals" && r.lcp !== null && r.inp === null)
    ).toBe(true);
  });
});
