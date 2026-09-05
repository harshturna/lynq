import { type BrowserContext, expect, type Page, test } from "@playwright/test";

type Batch = {
  v: 2;
  site: string;
  sid: string;
  pid: string;
  uid?: string;
  page: { url: string; title?: string };
  session: { ref?: string; url?: string };
  ctx: { sw?: number; sh?: number; vw?: number; vh?: number; lang?: string };
  events: {
    t: string;
    ts: number;
    seq: number;
    ms?: number;
    name?: string;
    props?: Record<string, unknown>;
  }[];
};
type Recorded = {
  at: number;
  headers: Record<string, string>;
  batch?: Batch;
  raw?: string;
};

async function batches(page: Page): Promise<Recorded[]> {
  const res = await page.request.get("/__batches");
  return (await res.json()) as Recorded[];
}
async function reset(page: Page) {
  await page.request.get("/__reset");
}
async function waitForBatches(
  page: Page,
  n: number,
  ms = 5000
): Promise<Recorded[]> {
  const deadline = Date.now() + ms;
  let got: Recorded[] = [];
  while (Date.now() < deadline) {
    got = await batches(page);
    if (got.length >= n) return got;
    await page.waitForTimeout(100);
  }
  return got;
}
const events = (list: Recorded[]) =>
  list.flatMap((r) =>
    (r.batch?.events ?? []).map((e) => ({
      ...e,
      pid: r.batch?.pid,
      sid: r.batch?.sid,
      url: r.batch?.page.url,
    }))
  );

test.beforeEach(async ({ page }) => {
  await reset(page);
});

test("a page load sends one pageview with page and session context, and drains the pre-load queue", async ({
  page,
}) => {
  await page.goto("/?utm_source=test");
  const got = await waitForBatches(page, 1);
  expect(got.length).toBeGreaterThanOrEqual(1);
  const b = got[0]?.batch as Batch;
  expect(got[0]?.headers["content-type"]).toContain("text/plain");
  expect(b).toMatchObject({ v: 2, site: "fixture.test" });
  expect(b.sid).toMatch(/^[0-9a-f]{16}$/);
  expect(b.pid).toMatch(/^[0-9a-f]{16}$/);
  expect(b.page.url).toContain("/?utm_source=test");
  expect(b.session.url).toContain("utm_source=test");
  // viewport size, not screen size, is what the Devices histogram measures (design §8.6)
  const vp = page.viewportSize();
  expect(b.ctx).toMatchObject({ vw: vp?.width, vh: vp?.height });
  expect(b.ctx.sw).toBeGreaterThan(0);
  const evs = events(got);
  expect(evs.find((e) => e.t === "pageview")).toBeTruthy();
  const queued = evs.find(
    (e) => e.t === "custom" && e.name === "queued_before_load"
  );
  expect(queued?.props).toEqual({ early: true });
});

test("SPA navigation flushes the old page and starts a new batch with a new pid; same-URL replaceState and hash changes send nothing", async ({
  page,
}) => {
  await page.goto("/");
  await waitForBatches(page, 1);
  const before = events(await batches(page));
  const firstPid = before[0]?.pid;
  await page.click("#spa");
  // the old page's engagement delta goes out first as its own batch; the new
  // page's pageview follows after the batching delay
  let got: Recorded[] = [];
  for (let i = 0; i < 50; i++) {
    got = await batches(page);
    if (events(got).filter((e) => e.t === "pageview").length >= 2) break;
    await page.waitForTimeout(100);
  }
  const pvs = events(got).filter((e) => e.t === "pageview");
  expect(pvs).toHaveLength(2);
  expect(pvs[1]?.pid).not.toBe(firstPid);
  expect(pvs[1]?.url).toContain("/spa/");
  const seqs = events(got).map((e) => e.seq);
  expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);
  await reset(page);
  await page.click("#same");
  await page.click("#hash");
  await page.waitForTimeout(1500);
  expect(
    events(await batches(page)).filter((e) => e.t === "pageview")
  ).toHaveLength(0);
});

test("hiding the tab sends an engagement delta carrying the current pid", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await waitForBatches(page, 1);
  const pid = (await batches(page))[0]?.batch?.pid;
  await page.waitForTimeout(1200);
  await reset(page);
  const other = await context.newPage();
  await other.goto("about:blank");
  await other.bringToFront();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const got = await waitForBatches(page, 1);
  const eng = events(got).find((e) => e.t === "engagement");
  expect(eng).toBeTruthy();
  expect(eng?.ms ?? 0).toBeGreaterThan(500);
  expect(eng?.pid).toBe(pid);
  await other.close();
});

test("a bfcache restore is a new pageview with a new pid", async ({ page }) => {
  await page.goto("/");
  await waitForBatches(page, 1);
  const first = (await batches(page))[0]?.batch?.pid;
  await reset(page);
  await page.evaluate(() => {
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true })
    );
  });
  const got = await waitForBatches(page, 1);
  const pv = events(got).find((e) => e.t === "pageview");
  expect(pv).toBeTruthy();
  expect(pv?.pid).not.toBe(first);
});

test("a tab opened with an opener continues the session; a noopener tab (the target=_blank default) starts a new one", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await waitForBatches(page, 1);
  const sid = (await batches(page))[0]?.batch?.sid;
  await reset(page);
  const [opener] = await Promise.all([
    context.waitForEvent("page"),
    page.click("#to-pricing-opener"),
  ]);
  await opener.waitForLoadState();
  const got = await waitForBatches(opener, 1);
  expect(got[0]?.batch?.sid).toBe(sid);
  expect(got[0]?.batch?.page.url).toContain("/pricing");
  await opener.close();
  await reset(page);
  const [noopener] = await Promise.all([
    context.waitForEvent("page"),
    page.click("#to-pricing"),
  ]);
  await noopener.waitForLoadState();
  const fresh = await waitForBatches(noopener, 1);
  expect(fresh[0]?.batch?.sid).toMatch(/^[0-9a-f]{16}$/);
  expect(fresh[0]?.batch?.sid).not.toBe(sid);
  await noopener.close();
});

test("track() batches within a second and the batch flushes on pagehide", async ({
  page,
}) => {
  await page.goto("/");
  await waitForBatches(page, 1);
  await reset(page);
  await page.click("#track");
  await page.click("#track");
  const got = await waitForBatches(page, 1, 3000);
  const customs = events(got).filter(
    (e) => e.t === "custom" && e.name === "clicked"
  );
  expect(customs).toHaveLength(2);
  expect(got.length).toBe(1); // both in one batch
  await reset(page);
  await page.evaluate(() => {
    (window as unknown as { lynq: { track: (n: string) => void } }).lynq.track(
      "before_unload"
    );
    window.dispatchEvent(new Event("pagehide"));
  });
  const flushed = await waitForBatches(page, 1, 1500);
  expect(events(flushed).some((e) => e.name === "before_unload")).toBe(true);
});

test("an oversized queue is split into several batches under the caps", async ({
  page,
}) => {
  await page.goto("/");
  await waitForBatches(page, 1);
  await reset(page);
  await page.evaluate(() => {
    const l = (
      window as unknown as { lynq: { track: (n: string, p?: unknown) => void } }
    ).lynq;
    for (let i = 0; i < 30; i++) l.track(`e${i}`, { blob: "x".repeat(600) });
  });
  const got = await waitForBatches(page, 2, 4000);
  expect(got.length).toBeGreaterThan(1);
  const customs = events(got).filter((e) => e.t === "custom");
  expect(customs).toHaveLength(30); // plus, possibly, one piggybacked engagement delta
  for (const r of got) {
    expect(r.batch?.events.length).toBeLessThanOrEqual(20);
    expect(JSON.stringify(r.batch).length).toBeLessThanOrEqual(8 * 1024 + 700);
  }
});

test("with site data blocked the tracker still records pageviews with an in-memory session", async ({
  browser,
}) => {
  const context: BrowserContext = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
  });
  const page = await context.newPage();
  await reset(page);
  await page.goto("/");
  const got = await waitForBatches(page, 1);
  expect(events(got).some((e) => e.t === "pageview")).toBe(true);
  expect(got[0]?.batch?.sid).toMatch(/^[0-9a-f]{16}$/);
  await context.close();
});

test("identify attaches the user id, and Global Privacy Control suppresses it", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await waitForBatches(page, 1);
  await reset(page);
  await page.evaluate(() =>
    (
      window as unknown as { lynq: { identify: (u: string) => void } }
    ).lynq.identify("user_42")
  );
  const got = await waitForBatches(page, 1);
  expect(got[0]?.batch?.uid).toBe("user_42");
  expect(events(got).some((e) => e.t === "identify")).toBe(true);

  const gpc = await browser.newContext();
  await gpc.addInitScript(() => {
    Object.defineProperty(navigator, "globalPrivacyControl", {
      get: () => true,
    });
  });
  const p2 = await gpc.newPage();
  await reset(p2);
  await p2.goto("/");
  await waitForBatches(p2, 1);
  await reset(p2);
  await p2.evaluate(() =>
    (
      window as unknown as {
        lynq: { identify: (u: string) => void; track: (n: string) => void };
      }
    ).lynq.identify("user_43")
  );
  await p2.evaluate(() =>
    (window as unknown as { lynq: { track: (n: string) => void } }).lynq.track(
      "after_identify"
    )
  );
  const g2 = await waitForBatches(p2, 1);
  expect(g2[0]?.batch?.uid).toBeUndefined();
  expect(events(g2).some((e) => e.t === "identify")).toBe(false);
  expect(events(g2).some((e) => e.name === "after_identify")).toBe(true);
  await gpc.close();
});

test("optOut stops everything until optIn", async ({ page }) => {
  await page.goto("/");
  await waitForBatches(page, 1);
  await page.evaluate(() =>
    (window as unknown as { lynq: { optOut: () => void } }).lynq.optOut()
  );
  await reset(page);
  await page.click("#track");
  await page.waitForTimeout(1500);
  expect(await batches(page)).toHaveLength(0);
  await page.evaluate(() =>
    (window as unknown as { lynq: { optIn: () => void } }).lynq.optIn()
  );
  await page.click("#track");
  const got = await waitForBatches(page, 1);
  expect(events(got).some((e) => e.name === "clicked")).toBe(true);
});

test("invariant: a random walk keeps page context on every batch, distinct pids across navigations, strictly increasing seq", async ({
  page,
}) => {
  await page.goto("/");
  await waitForBatches(page, 1);
  const seed = 7;
  let x = seed;
  const rand = () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return x / 0x7fffffff;
  };
  for (let i = 0; i < 20; i++) {
    const r = rand();
    if (r < 0.4) await page.click("#spa");
    else if (r < 0.7) await page.click("#track");
    else if (r < 0.85)
      await page.evaluate(() =>
        (
          window as unknown as { lynq: { identify: (u: string) => void } }
        ).lynq.identify("walker")
      );
    else await page.click("#hash");
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await page.waitForTimeout(1500);
  const got = await batches(page);
  expect(got.length).toBeGreaterThan(3);
  let lastSeq = 0;
  const pidsByUrl = new Map<string, Set<string>>();
  for (const r of got) {
    const b = r.batch as Batch;
    expect(b.page.url).toBeTruthy();
    expect(b.session.url).toBeTruthy();
    expect(b.sid).toMatch(/^[0-9a-f]{16}$/);
    for (const e of b.events) {
      expect(e.seq).toBeGreaterThan(lastSeq);
      lastSeq = e.seq;
    }
    const set = pidsByUrl.get(b.page.url) ?? new Set<string>();
    set.add(b.pid);
    pidsByUrl.set(b.page.url, set);
  }
  // a navigation always minted a new pid, so no pid is shared by two urls
  const allPids = [...pidsByUrl.values()].flatMap((s) => [...s]);
  expect(new Set(allPids).size).toBe(allPids.length);
});

test("extras chunk: outbound and download clicks and declarative events, only when enabled", async ({
  page,
}) => {
  await page.goto("/?full=1");
  await waitForBatches(page, 1);
  await page.waitForFunction(
    () =>
      (window as unknown as { __lynqExtras?: boolean }).__lynqExtras === true
  );
  await reset(page);
  await page.click("#outbound");
  await page.click("#download");
  await page.click("#internal");
  await page.click("#declared-inner");
  const got = await waitForBatches(page, 1, 4000);
  const customs = events(got).filter((e) => e.t === "custom");
  expect(customs.map((e) => e.name)).toEqual(
    expect.arrayContaining(["outbound", "download", "signup"])
  );
  expect(customs.find((e) => e.name === "outbound")?.props).toEqual({
    url: "https://example.com/elsewhere",
  });
  expect(customs.find((e) => e.name === "download")?.props).toEqual({
    url: "http://localhost:4321/files/report.pdf",
  });
  expect(customs.find((e) => e.name === "signup")?.props).toEqual({
    plan: "pro",
    cta: "hero",
  });
  expect(
    customs.some(
      (e) => e.props && (e.props as { url?: string }).url?.includes("/docs")
    )
  ).toBe(false);

  await page.goto("/");
  await waitForBatches(page, 1);
  await reset(page);
  await page.click("#outbound");
  await page.click("#declared-inner");
  await page.waitForTimeout(1500);
  const names = events(await batches(page))
    .filter((e) => e.t === "custom")
    .map((e) => e.name);
  expect(names).not.toEqual(
    expect.arrayContaining(["outbound", "download", "signup"])
  );
});

test("vitals chunk: web-vitals and navigation timing arrive as vitals events on the page's pid", async ({
  page,
}) => {
  await page.goto("/?full=1");
  await waitForBatches(page, 1);
  const pid = (await batches(page))[0]?.batch?.pid;
  await page.waitForFunction(
    () =>
      (window as unknown as { __lynqVitals?: boolean }).__lynqVitals === true
  );
  await page.mouse.move(10, 10);
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const got = await waitForBatches(page, 2, 6000);
  const vitals = events(got).filter((e) => e.t === "vitals") as unknown as {
    m: Record<string, number>;
    pid: string;
  }[];
  expect(vitals.length).toBeGreaterThan(0);
  const keys = new Set(vitals.flatMap((v) => Object.keys(v.m)));
  expect([...keys]).toEqual(
    expect.arrayContaining(["ttfb", "dcl", "load", "resources"])
  );
  expect(keys.has("fcp") || keys.has("lcp")).toBe(true);
  for (const v of vitals) expect(v.pid).toBe(pid);
});
