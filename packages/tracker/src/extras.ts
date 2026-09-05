/**
 * Extras chunk (design §8.1, §8.2): outbound link and download clicks, and
 * declarative events on elements carrying data-lynq-event. Loaded by the
 * core only when the script tag has data-outbound or data-auto-events.
 */
type Lynq = { track: (name: string, props?: Record<string, unknown>) => void };

(() => {
  const w = window as Window & { lynq?: Lynq; __lynqExtras?: boolean };
  if (w.__lynqExtras) return;
  w.__lynqExtras = true;
  const script = document.querySelector<HTMLScriptElement>("script[data-site]");
  const outbound = script?.dataset.outbound !== undefined;
  const auto = script?.dataset.autoEvents !== undefined;
  const DOWNLOAD =
    /\.(pdf|zip|gz|tar|dmg|pkg|exe|msi|apk|csv|xlsx?|docx?|pptx?|mp3|mp4|mov|wav|epub|txt|json)(\?.*)?$/i;

  const propsOf = (el: HTMLElement): Record<string, unknown> | undefined => {
    const out: Record<string, unknown> = {};
    let any = false;
    for (const [k, v] of Object.entries(el.dataset)) {
      if (k.startsWith("lynqProp") && k.length > 8 && v !== undefined) {
        const name = k.slice(8);
        out[name.charAt(0).toLowerCase() + name.slice(1)] = v;
        any = true;
      }
    }
    return any ? out : undefined;
  };

  document.addEventListener(
    "click",
    (e) => {
      const lynq = w.lynq;
      if (!lynq) return;
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      if (auto) {
        const el = target.closest<HTMLElement>("[data-lynq-event]");
        const name = el?.dataset.lynqEvent;
        if (el && name) lynq.track(name, propsOf(el));
      }
      if (outbound) {
        const a = target.closest<HTMLAnchorElement>("a[href]");
        if (!a) return;
        let url: URL;
        try {
          url = new URL(a.href, location.href);
        } catch {
          return;
        }
        if (url.protocol !== "http:" && url.protocol !== "https:") return;
        if (DOWNLOAD.test(url.pathname) || a.hasAttribute("download")) {
          lynq.track("download", { url: url.href.slice(0, 256) });
        } else if (url.host !== location.host) {
          lynq.track("outbound", { url: url.href.slice(0, 256) });
        }
      }
    },
    true
  );
})();
