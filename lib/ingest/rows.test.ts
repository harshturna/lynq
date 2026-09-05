import { describe, expect, it } from "vitest";
import { parseUserAgent } from "./enrich";
import { batch, CHROME, SITE } from "./fixtures";
import { buildRows, hexToBigInt, normaliseProps } from "./rows";
import { batchSchema } from "./schema";

const now = new Date("2026-09-05T12:00:00Z");
const geo = { country: "CA", region: "MB", city: "Winnipeg" };

function build(over: Record<string, unknown> = {}, site = SITE) {
  const parsed = batchSchema.parse(batch(over, now.getTime()));
  return buildRows({
    batch: parsed,
    site,
    hostnameFromOrigin: "aivia.byharsh.com",
    ua: parseUserAgent(CHROME),
    geo,
    visitorId: BigInt(7),
    userHash: BigInt(0),
    receivedAt: now,
  });
}

describe("normaliseProps", () => {
  it("caps, stringifies, drops nested values and parses revenue", () => {
    const r = normaliseProps({
      plan: "pro",
      n: 3,
      ok: true,
      nested: { a: 1 },
      revenue: "4900",
      long: "x".repeat(300),
    });
    expect(r.props).toEqual({
      plan: "pro",
      n: "3",
      ok: "true",
      revenue: "4900",
      long: "x".repeat(256),
    });
    expect(r.revenue).toBe("4900");
    expect(normaliseProps({ revenue: "$12.50" }).revenue).toBeNull();
  });
});

describe("buildRows", () => {
  it("copies page, session and request context onto every row", () => {
    const { rows, suspect } = build();
    expect(rows).toHaveLength(4);
    expect(suspect).toBe(false);
    for (const r of rows) {
      expect(r).toMatchObject({
        site_id: 31,
        hostname: "aivia.byharsh.com",
        path: "/pricing",
        query: "utm_source=x",
        title: "",
        referrer: "google.com",
        source: "newsletter",
        channel: "Email",
        utm_medium: "email",
        country: "CA",
        city: "Winnipeg",
        device: "desktop",
        browser: "Chrome",
        screen_width: 1440,
        viewport_width: 1280,
        viewport_height: 720,
        language: "en-GB",
        session_id: hexToBigInt("8f3c1a2b3c4d5e6f"),
        pageview_id: hexToBigInt("a91e0b1c2d3e4f50"),
        ingest_version: 2,
      });
    }
    expect(rows[1]).toMatchObject({
      event: "custom",
      name: "signup",
      props: { plan: "pro", revenue: "4900" },
      revenue: "4900",
    });
    expect(rows[2]).toMatchObject({
      event: "engagement",
      engaged_ms: 65780,
      scroll_depth: 72,
    });
    expect(rows[3]).toMatchObject({
      event: "vitals",
      lcp: 1834,
      cls: 0.02,
      inp: 120,
      resources: 42,
      lcp_target: "img.hero",
      fcp: null,
    });
  });
  it("stores the title only when the site allows it", () => {
    const { rows } = build(
      {},
      { ...SITE, settings: { ...SITE.settings, store_titles: true } }
    );
    expect(rows[0]?.title).toBe("Pricing");
  });
  it("marks a site mismatch and a non-increasing seq as suspect", () => {
    expect(build({ site: "other.example" }).suspectReasons).toEqual([
      "site_mismatch",
    ]);
    const events = batch({}, now.getTime()).events as { seq: number }[];
    const third = events[2];
    if (third) third.seq = 1;
    expect(build({ events }).suspectReasons).toEqual(["seq_not_increasing"]);
  });
  it("drops out-of-window events and excluded paths, and counts them", () => {
    const events = batch({}, now.getTime()).events as { ts: number }[];
    const first = events[0];
    if (first) first.ts = now.getTime() - 25 * 3_600_000;
    expect(build({ events }).dropped).toEqual([
      { stage: "time_bound", count: 1 },
    ]);
    const excluded = {
      ...SITE,
      settings: { ...SITE.settings, excluded_paths: ["/pricing*"] },
    };
    const out = build({}, excluded);
    expect(out.rows).toHaveLength(0);
    expect(out.dropped).toEqual([{ stage: "excluded_path", count: 4 }]);
  });
});
