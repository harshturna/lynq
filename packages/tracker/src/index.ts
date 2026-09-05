import {
  type Ctx,
  envelope,
  hexId,
  type PageContext,
  pageKey,
  split,
} from "./envelope";
import {
  BATCH_DELAY_MS,
  type BatchEvent,
  SAFETY_FLUSH_MS,
  SESSION_IDLE_MS,
  SESSION_MAX_MS,
  type SessionRecord,
} from "./types";

/**
 * Lynq tracker v2 core (design §6, §7.1, §8). One static file; every
 * behaviour is configured by attributes on the script tag:
 *   data-site (required), data-respect-dnt, data-allow-localhost,
 *   data-vitals / data-outbound / data-auto-events (extra chunks, TICKET-019).
 *
 * Nothing persistent is written to the browser except, on request, the
 * opt-out flag. The session record lives in sessionStorage for the tab.
 */
(() => {
  const w = window as Window & {
    lynq?: LynqApi;
    lynqQueue?: { name: string; properties?: Record<string, unknown> }[];
  };
  const d = document;
  const script =
    (d.currentScript as HTMLScriptElement | null) ??
    d.querySelector<HTMLScriptElement>("script[data-site]");
  const site = script?.dataset.site?.toLowerCase().replace(/^www\./, "");
  if (!site || w.lynq) return;

  type LynqApi = {
    track: (name: string, props?: Record<string, unknown>) => void;
    identify: (uid: string) => void;
    optOut: () => void;
    optIn: () => void;
    /** vitals chunk hook: one vitals event per finalised metric */
    _v: (m: Record<string, number>, targets?: Record<string, string>) => void;
  };

  // ------------------------------------------------------------ consent
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  const optedOut = () => {
    try {
      return localStorage.getItem("lynq_optout") === "1";
    } catch {
      return false;
    }
  };
  const gpc = nav.globalPrivacyControl === true; // anonymous mode: no identify, pageviews continue
  const dnt =
    script?.dataset.respectDnt !== undefined &&
    (nav.doNotTrack === "1" ||
      (w as unknown as { doNotTrack?: string }).doNotTrack === "1");
  const isLocal =
    /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) &&
    script?.dataset.allowLocalhost === undefined;

  const disabled = () => optedOut() || dnt || isLocal;

  // ------------------------------------------------------------ session
  const endpoint = (() => {
    try {
      return `${new URL(script?.src ?? location.href).origin}/api/collect`;
    } catch {
      return "/api/collect";
    }
  })();
  const key = `lynq:${site}`;
  const random = (n: number) => {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return a;
  };
  let memory: SessionRecord | null = null;
  const read = (): SessionRecord | null => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as SessionRecord) : memory;
    } catch {
      return memory;
    }
  };
  const write = (r: SessionRecord) => {
    memory = r;
    try {
      sessionStorage.setItem(key, JSON.stringify(r));
    } catch {
      /* storage blocked: the in-memory record carries the page load */
    }
  };
  const fresh = (now: number): SessionRecord => ({
    sid: hexId(random),
    started: now,
    last: now,
    seq: 0,
    ref: d.referrer || "",
    url: location.href,
  });
  /** The current session, rotating it after 30 min idle or 6 h total. */
  const session = (): SessionRecord => {
    const now = Date.now();
    let r = read();
    if (
      !r ||
      now - r.last > SESSION_IDLE_MS ||
      now - r.started > SESSION_MAX_MS
    ) {
      if (r) flushNow(); // a queued batch goes out under the old sid first
      r = fresh(now);
    }
    r.last = now;
    write(r);
    return r;
  };

  // ------------------------------------------------------------ page + queue
  let page: PageContext = {
    pid: hexId(random),
    url: location.href,
    title: d.title,
  };
  let lastKey = pageKey(location.href);
  let queue: BatchEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const ctx = (): Ctx => ({
    sw: screen?.width,
    sh: screen?.height,
    lang: nav.language,
  });

  const send = (body: string) => {
    let ok = false;
    try {
      if (nav.sendBeacon)
        ok = nav.sendBeacon(
          endpoint,
          new Blob([body], { type: "text/plain;charset=UTF-8" })
        );
    } catch {
      ok = false;
    }
    if (!ok) {
      try {
        fetch(endpoint, {
          method: "POST",
          body,
          keepalive: true,
          credentials: "omit",
        }).catch(() => {});
      } catch {
        /* nothing left to try; the tracker never retries */
      }
    }
  };

  /** Sends everything queued, with the pending engagement delta piggybacked. */
  const flushNow = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    reportEngagement(false);
    if (!queue.length) return;
    const events = queue;
    queue = [];
    const s = read() ?? session();
    for (const { body } of split(
      (evs) => envelope(site, s, page, ctx(), evs, gpc),
      events
    ))
      send(body);
    lastSend = Date.now();
  };
  const schedule = () => {
    if (!timer) timer = setTimeout(flushNow, BATCH_DELAY_MS);
  };
  type Queued = {
    [K in BatchEvent as K["t"]]: Omit<K, "ts" | "seq">;
  }[BatchEvent["t"]];
  const push = (ev: Queued) => {
    if (disabled()) return;
    const s = session();
    s.seq += 1;
    write(s);
    queue.push({ ...ev, ts: Date.now(), seq: s.seq } as BatchEvent);
    schedule();
  };

  // ------------------------------------------------------------ engagement
  let visibleSince: number | null = null;
  let unreportedMs = 0;
  let maxScroll = 0;
  let lastSend = Date.now();
  const visible = () => d.visibilityState === "visible";
  const startVisible = () => {
    if (visibleSince === null && visible()) visibleSince = Date.now();
  };
  const stopVisible = () => {
    if (visibleSince !== null) {
      unreportedMs += Date.now() - visibleSince;
      visibleSince = null;
    }
  };
  const onScroll = () => {
    const h = d.documentElement;
    const total = Math.max(h.scrollHeight, 1);
    const seen = Math.min(
      100,
      Math.round(((w.scrollY + w.innerHeight) / total) * 100)
    );
    if (seen > maxScroll) maxScroll = seen;
  };
  /** Queue an engagement delta if there is one; `standalone` also flushes. */
  const reportEngagement = (standalone: boolean) => {
    if (disabled()) return;
    if (visibleSince !== null) {
      unreportedMs += Date.now() - visibleSince;
      visibleSince = visible() ? Date.now() : null;
    }
    if (unreportedMs <= 0) return;
    const s = session();
    s.seq += 1;
    write(s);
    queue.push({
      t: "engagement",
      ts: Date.now(),
      seq: s.seq,
      ms: Math.round(unreportedMs),
      scroll: maxScroll,
    });
    unreportedMs = 0;
    if (standalone) flushNow();
  };

  // ------------------------------------------------------------ pageviews
  const pageview = () => {
    if (disabled()) return;
    push({ t: "pageview" });
  };
  const navigate = () => {
    const k = pageKey(location.href);
    if (k === lastKey) return;
    flushNow(); // the old page's batch, with its engagement delta, goes out first
    lastKey = k;
    page = { pid: hexId(random), url: location.href, title: d.title };
    maxScroll = 0;
    startVisible();
    pageview();
  };
  const patch = (name: "pushState" | "replaceState") => {
    const original = history[name];
    history[name] = function (
      this: History,
      ...args: Parameters<History["pushState"]>
    ) {
      const result = original.apply(this, args);
      navigate();
      return result;
    } as History["pushState"];
  };
  patch("pushState");
  patch("replaceState");
  w.addEventListener("popstate", navigate);
  w.addEventListener("hashchange", navigate);

  // bfcache: the page comes back alive with its old state; it is a new view
  w.addEventListener("pageshow", (e) => {
    if ((e as PageTransitionEvent).persisted) {
      page = { pid: hexId(random), url: location.href, title: d.title };
      maxScroll = 0;
      unreportedMs = 0;
      visibleSince = null;
      startVisible();
      session();
      pageview();
    }
  });

  // ------------------------------------------------------------ lifecycle
  d.addEventListener("visibilitychange", () => {
    if (visible()) startVisible();
    else {
      stopVisible();
      reportEngagement(true);
    }
  });
  w.addEventListener("focus", startVisible);
  w.addEventListener("blur", stopVisible);
  w.addEventListener("pagehide", () => {
    stopVisible();
    reportEngagement(true);
  });
  w.addEventListener("scroll", onScroll, { passive: true });
  setInterval(() => {
    if (visible() && Date.now() - lastSend > SAFETY_FLUSH_MS)
      reportEngagement(true);
  }, 60_000);

  // ------------------------------------------------------------ public api
  const api: LynqApi = {
    track: (name, props) => {
      if (typeof name !== "string" || !name) return;
      push({
        t: "custom",
        name: name.slice(0, 64),
        props: props && typeof props === "object" ? props : undefined,
      });
    },
    identify: (uid) => {
      if (gpc || typeof uid !== "string" || !uid) return;
      const s = session();
      s.uid = uid.slice(0, 128);
      write(s);
      push({ t: "identify" });
    },
    optOut: () => {
      try {
        localStorage.setItem("lynq_optout", "1");
      } catch {
        /* nothing to do */
      }
    },
    optIn: () => {
      try {
        localStorage.removeItem("lynq_optout");
      } catch {
        /* nothing to do */
      }
    },
    _v: (m, targets) => {
      if (!m || typeof m !== "object") return;
      push({ t: "vitals", m, targets });
    },
  };
  w.lynq = api;

  // Optional chunks, from the same origin as this script (design §8.1).
  const load = (name: string) => {
    const el = d.createElement("script");
    el.src = endpoint.replace(/\/api\/collect$/, `/js/${name}.js`);
    el.async = true;
    d.head.appendChild(el);
  };
  if (
    script?.dataset.outbound !== undefined ||
    script?.dataset.autoEvents !== undefined
  )
    load("lynq-extras");
  if (script?.dataset.vitals !== undefined) load("lynq-vitals");

  // ------------------------------------------------------------ start
  session();
  startVisible();
  onScroll();
  pageview();
  for (const q of w.lynqQueue ?? []) api.track(q.name, q.properties);
  w.lynqQueue = undefined;
})();
