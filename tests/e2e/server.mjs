// Fixture server for the tracker's Playwright suite (design §8.3): serves
// test pages with the built tracker and records every batch POSTed to
// /api/collect so tests can assert on exactly what the browser sent.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 4321);
const tracker = readFileSync("public/js/lynq.js", "utf8");
let batches = [];

const page = (title, body = "", attrs = "") => `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<script>window.lynqQueue=[{name:"queued_before_load",properties:{early:true}}];</script>
<script defer src="/js/lynq.js" data-site="fixture.test" data-allow-localhost ${attrs}></script>
</head><body style="margin:0"><h1>${title}</h1><nav>
<a id="to-docs" href="/docs">docs</a> <a id="to-pricing" href="/pricing" target="_blank">pricing (new tab, noopener)</a> <a id="to-pricing-opener" href="/pricing" target="_blank" rel="opener">pricing (new tab, opener)</a>
<button id="spa" type="button" onclick="history.pushState({}, '', '/spa/' + Math.random().toString(36).slice(2, 6))">spa</button>
<button id="same" type="button" onclick="history.replaceState({}, '', location.pathname)">same</button>
<button id="hash" type="button" onclick="location.hash = 'h' + Date.now()">hash</button>
<button id="track" type="button" onclick="lynq.track('clicked', { where: 'button' })">track</button>
</nav>${body}<div style="height:3000px"></div></body></html>`;

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (req.method === "POST" && url.pathname === "/api/collect") {
    let body = "";
    req.on("data", (c) => {
      body += c;
    });
    req.on("end", () => {
      try {
        batches.push({
          at: Date.now(),
          headers: req.headers,
          batch: JSON.parse(body),
        });
      } catch {
        batches.push({ at: Date.now(), headers: req.headers, raw: body });
      }
      res.writeHead(202, {
        "access-control-allow-origin": req.headers.origin ?? "*",
      });
      res.end();
    });
    return;
  }
  if (url.pathname === "/__batches") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(batches));
    return;
  }
  if (url.pathname === "/__reset") {
    batches = [];
    res.writeHead(204);
    res.end();
    return;
  }
  if (url.pathname === "/js/lynq.js") {
    res.writeHead(200, { "content-type": "text/javascript" });
    res.end(tracker);
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(page(url.pathname === "/" ? "Home" : url.pathname.slice(1)));
}).listen(port, () =>
  console.log(`fixture server on http://localhost:${port}`)
);
