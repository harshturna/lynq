import { describe, expect, it } from "vitest";
import {
  defaultState,
  hasFilter,
  parseFilter,
  parseSearch,
  toQuery,
  toSearch,
  withFilter,
  withoutFilter,
  withParam,
  withSort,
  withView,
} from "./url-state";

describe("parseSearch", () => {
  it("returns the defaults for an empty query and for garbage", () => {
    expect(parseSearch({})).toEqual(defaultState());
    expect(
      parseSearch({
        range: "whenever",
        compare: "later",
        f: "nope",
        device: "toaster",
        sel: "",
      })
    ).toEqual(defaultState());
  });

  it("reads presets and custom ranges, and ignores bad dates", () => {
    expect(parseSearch({ range: "last_7d" }).range).toBe("last_7d");
    expect(parseSearch({ range: "2026-08-06,2026-09-04" }).range).toEqual({
      from: "2026-08-06",
      to: "2026-09-04",
    });
    expect(parseSearch({ range: "2026-09-04,2026-08-06" }).range).toBe(
      "last_30d"
    ); // reversed
    expect(parseSearch({ range: "2026-02-30,2026-03-01" }).range).toBe(
      "last_30d"
    ); // not a date
    expect(parseSearch({ range: "2026-8-6,2026-9-4" }).range).toBe("last_30d");
  });

  it("normalises a single f and a repeated f the same way", () => {
    const one = parseSearch({ f: "country:is:CA" });
    const many = parseSearch({ f: ["country:is:CA", "device:is:mobile"] });
    expect(one.filters).toEqual([
      { dimension: "country", op: "is", values: ["CA"] },
    ]);
    expect(many.filters).toHaveLength(2);
  });

  it("splits values on | and decodes encoded separators inside a value", () => {
    const s = parseSearch({ f: "path:is:/pricing|/docs%2Fa%3Ab%7Cc" });
    expect(s.filters[0].values).toEqual(["/pricing", "/docs/a:b|c"]);
  });

  it("drops unknown dimensions and operators but keeps prop and session dimensions", () => {
    const s = parseSearch({
      f: [
        "nope:is:x",
        "country:between:CA",
        "prop:plan:is:pro",
        "entry_path:is:/",
        "bounced:is:true",
      ],
    });
    expect(s.filters.map((f) => f.dimension)).toEqual([
      "prop:plan",
      "entry_path",
      "bounced",
    ]);
  });

  it("OR-merges a repeated dimension and op, and dedupes values", () => {
    const s = parseSearch({
      f: ["country:is:CA|US", "country:is:US|IN", "country:is_not:DE"],
    });
    expect(s.filters).toEqual([
      { dimension: "country", op: "is", values: ["CA", "US", "IN"] },
      { dimension: "country", op: "is_not", values: ["DE"] },
    ]);
  });

  it("reads namespaced view and sort params and ignores malformed regions", () => {
    const s = parseSearch({
      "view.pages": "exit",
      "sort.sources": "-visitors",
      "sort.x": "1bad",
      "view.Bad Region": "x",
    });
    expect(s.view).toEqual({ pages: "exit" });
    expect(s.sort).toEqual({ sources: { col: "visitors", dir: "desc" } });
  });

  it("reads sel, session and device with validation", () => {
    const s = parseSearch({
      sel: "/pricing",
      session: "-1234:5678",
      device: "mobile",
    });
    expect(s.sel).toBe("/pricing");
    expect(s.session).toEqual({ visitorId: "-1234", sessionId: "5678" });
    expect(s.device).toBe("mobile");
    expect(parseSearch({ session: "abc:def" }).session).toBeUndefined();
    expect(parseSearch({ session: "1:2:3" }).session).toBeUndefined();
  });

  it("never throws on hostile input", () => {
    expect(() =>
      parseSearch({
        f: "path:is:%E0%A4%A",
        range: ",",
        "sort.a": "-",
        session: ":",
      })
    ).not.toThrow();
    expect(parseSearch({ f: "path:is:%E0%A4%A" }).filters).toEqual([]);
  });
});

describe("toSearch", () => {
  it("omits defaults and writes keys in a stable order", () => {
    expect(toQuery(defaultState())).toBe("");
    const s = parseSearch({
      device: "desktop",
      "sort.pages": "-visitors",
      sel: "/pricing",
      f: ["path:is:/a", "country:is:CA"],
      compare: "none",
      range: "last_7d",
      "view.sources": "campaigns",
    });
    expect(toQuery(s)).toBe(
      "?range=last_7d&compare=none&f=path%3Ais%3A%2Fa&f=country%3Ais%3ACA&view.sources=campaigns&sort.pages=-visitors&sel=%2Fpricing&device=desktop"
    );
  });

  it("round-trips every parameter, including separators inside values", () => {
    const s = parseSearch({
      range: "2026-08-06,2026-09-04",
      compare: "previous_year",
      f: ["path:is:/a%7Cb|/c%3Ad", "prop:plan:contains:pro"],
      "view.pages": "entry",
      "sort.pages": "engaged",
      sel: "signup",
      session: "1:2",
      device: "mobile",
    });
    const back = parseSearch(
      Object.fromEntries(
        [...toSearch(s).entries()].reduce<[string, string | string[]][]>(
          (acc, [k, v]) => {
            const hit = acc.find(([key]) => key === k);
            if (hit) hit[1] = ([] as string[]).concat(hit[1], v);
            else acc.push([k, v]);
            return acc;
          },
          []
        )
      )
    );
    expect(back).toEqual(s);
    expect(s.filters[0].values).toEqual(["/a|b", "/c:d"]);
  });
});

describe("state helpers", () => {
  const base = parseSearch({ f: "country:is:CA" });

  it("withFilter OR-merges into the same dimension and op", () => {
    const s = withFilter(base, {
      dimension: "country",
      op: "is",
      values: ["US", "CA"],
    });
    expect(s.filters).toEqual([
      { dimension: "country", op: "is", values: ["CA", "US"] },
    ]);
    const t = withFilter(base, {
      dimension: "device",
      op: "is",
      values: ["mobile"],
    });
    expect(t.filters).toHaveLength(2);
    expect(hasFilter(t, "device", "mobile")).toBe(true);
  });

  it("withoutFilter removes one value or the whole dimension", () => {
    const s = withFilter(base, {
      dimension: "country",
      op: "is",
      values: ["US"],
    });
    expect(withoutFilter(s, "country", "CA").filters[0].values).toEqual(["US"]);
    expect(withoutFilter(s, "country").filters).toEqual([]);
  });

  it("withParam sets and clears, withView and withSort are per region", () => {
    const s = withParam(base, "sel", "/pricing");
    expect(s.sel).toBe("/pricing");
    expect(withParam(s, "sel", undefined).sel).toBeUndefined();
    expect(withView(base, "pages", "exit").view).toEqual({ pages: "exit" });
    expect(withSort(base, "pages", "visitors", "desc").sort).toEqual({
      pages: { col: "visitors", dir: "desc" },
    });
  });

  it("parseFilter rejects empty parts", () => {
    expect(parseFilter("country:is:")).toBeNull();
    expect(parseFilter(":is:CA")).toBeNull();
    expect(parseFilter("country::CA")).toBeNull();
  });
});

describe("metric", () => {
  it("keeps a known metric, drops the default and unknown values", () => {
    expect(parseSearch({ metric: "sessions" }).metric).toBe("sessions");
    expect(parseSearch({ metric: "visitors" }).metric).toBeUndefined();
    expect(parseSearch({ metric: "revenue" }).metric).toBeUndefined();
    expect(toQuery({ ...defaultState(), metric: "kpi" })).toBe("?metric=kpi");
    expect(toQuery({ ...defaultState(), metric: "visitors" })).toBe("");
  });
});
