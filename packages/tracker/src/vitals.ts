import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals/attribution";

/**
 * Vitals chunk (design §8.4): Google's web-vitals attribution build for LCP,
 * CLS, INP, FCP and TTFB, plus navigation timing for dcl, load and tti,
 * a longtask sum for tbt, and the resource count, so the Performance tab
 * keeps every card it has today. Loaded only with data-vitals.
 *
 * Each metric is reported as its own vitals event as soon as web-vitals
 * finalises it; the server stores only the columns present, and NULLs drop
 * out of the percentile queries.
 */
type Lynq = {
  _v?: (m: Record<string, number>, targets?: Record<string, string>) => void;
};

(() => {
  const w = window as Window & { lynq?: Lynq; __lynqVitals?: boolean };
  if (w.__lynqVitals) return;
  w.__lynqVitals = true;
  const report = (
    m: Record<string, number>,
    targets?: Record<string, string>
  ) => w.lynq?._v?.(m, targets);
  const round = (n: number, d = 0) => Number(n.toFixed(d));

  onLCP((metric) =>
    report(
      { lcp: round(metric.value) },
      metric.attribution.target
        ? { lcp: metric.attribution.target.slice(0, 256) }
        : undefined
    )
  );
  onCLS((metric) => report({ cls: round(metric.value, 4) }));
  onINP((metric) =>
    report(
      { inp: round(metric.value) },
      metric.attribution.interactionTarget
        ? { inp: metric.attribution.interactionTarget.slice(0, 256) }
        : undefined
    )
  );
  onFCP((metric) => report({ fcp: round(metric.value) }));
  onTTFB((metric) => report({ ttfb: round(metric.value) }));

  // Navigation timing and resources, once, after the load event.
  const timing = () => {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (!nav) return;
    const m: Record<string, number> = {};
    if (nav.domContentLoadedEventStart > 0)
      m.dcl = round(nav.domContentLoadedEventStart);
    if (nav.loadEventStart > 0) m.load = round(nav.loadEventStart);
    if (nav.domInteractive > 0) m.tti = round(nav.domInteractive); // what v1 called TTI
    m.resources = performance.getEntriesByType("resource").length;
    report(m);
  };
  if (document.readyState === "complete") setTimeout(timing, 0);
  else
    window.addEventListener("load", () => setTimeout(timing, 0), {
      once: true,
    });

  // Total blocking time: long tasks over 50 ms, reported when the page hides.
  let tbt = 0;
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        tbt += Math.max(0, entry.duration - 50);
    });
    po.observe({ type: "longtask", buffered: true });
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "hidden" && tbt > 0) {
          report({ tbt: round(tbt) });
          tbt = 0;
        }
      },
      { capture: true }
    );
  } catch {
    /* longtask unsupported */
  }
})();
