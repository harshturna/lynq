import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { allowKey, hasScope, type ResolvedKey } from "@/lib/api-keys";
import { FAMILIES, FAMILY_LABEL, type Family } from "@/lib/crawler-families";
import { fmtDuration, fmtInt, fmtPct } from "@/lib/format";
import { insertNote } from "@/lib/notes/db";
import { validateNote } from "@/lib/notes/validate";
import { buildContext } from "@/lib/query/authorize";
import type { MetricSpec } from "@/lib/query/breakdown";
import type { FunnelStep, GoalDef } from "@/lib/query/goals";
import type { Metric } from "@/lib/query/primitives";
import * as q from "@/lib/query/run";
import { fmtVital, RENDERED_VITALS, vitalStatus } from "@/lib/vitals";
import {
  ArgError,
  checkDimension,
  compareSchema,
  contextOptions,
  DIMENSIONS,
  granularitySchema,
  METRICS,
  RANGE_PRESETS,
  type ReadArgs,
  readShape,
  type ToolMetric,
} from "./args";
import type { AgentSite } from "./site";

/**
 * The tools an agent gets (docs/design/agents-mcp-and-cli.md §4, D-019):
 * one per question, each a thin adapter from a JSON-schema argument object
 * to a lib/query primitive, returning a one-sentence `summary` beside small
 * `data`. Aggregates only, never events or sessions. Every call counts
 * against the key's limit.
 */
type Result = { summary: string; data: unknown };

const ok = (r: Result) => ({
  content: [{ type: "text" as const, text: JSON.stringify(r) }],
  structuredContent: r as unknown as Record<string, unknown>,
});
const refuse = (text: string) => ({
  isError: true,
  content: [{ type: "text" as const, text }],
});

const rangeText = (args: ReadArgs) =>
  typeof args.range === "object"
    ? `${args.range.from} to ${args.range.to}`
    : (args.range ?? "last_30d").replace(/_/g, " ");

export function createAgentServer(
  key: ResolvedKey,
  site: AgentSite
): McpServer {
  const server = new McpServer(
    { name: "lynq", version: "1.0.0" },
    {
      instructions: `Analytics for ${site.url}. Ranges are in the site's timezone (${site.timezone}). Start with the site tool to learn the goals, dimensions and metrics; every number is an aggregate over visits, never a person.`,
    }
  );
  const ctxFor = (args: ReadArgs) => buildContext(site, contextOptions(args));
  const goalDef = (g: {
    id: number;
    kind: "pageview" | "event";
    match: string;
  }): GoalDef => ({
    id: g.id,
    kind: g.kind,
    match: g.match,
  });
  const kpi = site.goals.find((g) => g.id === site.kpiGoalId) ?? null;

  /** Wraps a tool body with the limiter and the argument errors. */
  const tool =
    <A>(fn: (args: A) => Promise<Result>) =>
    async (args: A) => {
      if (!(await allowKey(key.keyId)))
        return refuse(
          "This key has made 120 requests this minute; try again shortly."
        );
      try {
        return ok(await fn(args));
      } catch (err) {
        if (err instanceof ArgError) return refuse(err.message);
        throw err;
      }
    };

  server.registerTool(
    "site",
    {
      title: "About this site",
      description:
        "What this key can see: the site, its hostnames and timezone, its goals and KPI, and the ranges, dimensions and metrics the other tools accept. Call it first.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    tool(async () => ({
      summary: `${site.url} (${site.name}), timezone ${site.timezone}, ${site.goals.length} ${site.goals.length === 1 ? "goal" : "goals"}${kpi ? `, KPI ${kpi.name}` : ", no KPI"}.`,
      data: {
        url: site.url,
        name: site.name,
        hostnames: site.hostnames,
        timezone: site.timezone,
        goals: site.goals.map((g) => ({
          id: g.id,
          name: g.name,
          kind: g.kind,
          match: g.match,
          revenue: g.revenue,
          target: g.target,
          kpi: g.id === site.kpiGoalId,
        })),
        ranges: RANGE_PRESETS,
        dimensions: DIMENSIONS,
        metrics: METRICS,
      },
    }))
  );

  server.registerTool(
    "summary",
    {
      title: "How the site is doing",
      description:
        "Unique visitors, sessions, pageviews, bounce rate, engaged time and revenue over a range, with the previous period beside them when compare is set.",
      inputSchema: { ...readShape, compare: compareSchema.optional() },
      annotations: { readOnlyHint: true },
    },
    tool(async (args: ReadArgs) => {
      const ctx = ctxFor(args);
      const [s, rev, prevRev] = await Promise.all([
        q.summary(ctx),
        q.revenue(ctx),
        ctx.compare
          ? q.revenue({ ...ctx, range: ctx.compare, compare: undefined })
          : null,
      ]);
      const cur = {
        ...s.current,
        revenue: rev.revenue,
        payments: rev.payments,
      };
      const before = s.compare
        ? {
            ...s.compare,
            revenue: prevRev?.revenue ?? 0,
            payments: prevRev?.payments ?? 0,
          }
        : null;
      const change = before?.visitors
        ? `, ${cur.visitors >= before.visitors ? "up" : "down"} ${fmtPct(Math.abs(((cur.visitors - before.visitors) / before.visitors) * 100), 1)} on the period before`
        : "";
      return {
        summary: `${fmtInt(cur.visitors)} unique visitors, ${fmtInt(cur.sessions)} sessions and ${fmtInt(cur.pageviews)} pageviews ${rangeText(args)}; bounce rate ${fmtPct(cur.bounce_rate, 0)}, engaged time ${fmtDuration(cur.engaged_time)}${change}.`,
        data: { range: rangeText(args), current: cur, previous: before },
      };
    })
  );

  server.registerTool(
    "timeseries",
    {
      title: "How a metric moved",
      description:
        "One metric per bucket over the range, at the range's natural granularity unless one is given; the previous period beside it when compare is set.",
      inputSchema: {
        metric: z.enum([...METRICS.filter((m) => m !== "revenue")] as [
          Metric,
          ...Metric[],
        ]),
        granularity: granularitySchema.optional(),
        ...readShape,
        compare: compareSchema.optional(),
      },
      annotations: { readOnlyHint: true },
    },
    tool(async (args: ReadArgs & { metric: Metric }) => {
      const ctx = ctxFor(args);
      const g = args.granularity ?? ctx.granularity;
      const [cur, before] = await Promise.all([
        q.timeseries(ctx, args.metric, g),
        ctx.compare
          ? q.timeseries(
              { ...ctx, range: ctx.compare, compare: undefined },
              args.metric,
              g
            )
          : null,
      ]);
      const points = cur.map((p, i) => ({
        bucket: p.bucket.toISOString(),
        value: p.value,
        ...(before ? { previous: before[i]?.value ?? 0 } : {}),
      }));
      const peak = points.reduce(
        (m, p) => (p.value > m.value ? p : m),
        points[0]
      );
      return {
        summary: points.length
          ? `${args.metric.replace(/_/g, " ")} per ${g} ${rangeText(args)}: ${points.length} buckets, peak ${fmtInt(peak.value)} at ${peak.bucket.slice(0, 10)}.`
          : `No data ${rangeText(args)}.`,
        data: { metric: args.metric, granularity: g, points },
      };
    })
  );

  server.registerTool(
    "breakdown",
    {
      title: "Which pages, sources, countries, devices…",
      description:
        "Rows of one dimension with the chosen metrics, ranked by the first metric. Dimensions are the dashboard's (path, entry_channel, country, device, …) or prop:<key> for a custom event property. Add a goal id for completions and conversion per row.",
      inputSchema: {
        dimension: z
          .string()
          .describe(`One of ${DIMENSIONS.join(", ")}, or prop:<key>.`),
        metrics: z
          .array(z.enum(METRICS as unknown as [ToolMetric, ...ToolMetric[]]))
          .min(1)
          .max(6)
          .optional(),
        goal: z
          .number()
          .int()
          .optional()
          .describe("A goal id from the site tool."),
        limit: z.number().int().min(1).max(200).optional(),
        ...readShape,
      },
      annotations: { readOnlyHint: true },
    },
    tool(
      async (
        args: ReadArgs & {
          dimension: string;
          metrics?: ToolMetric[];
          goal?: number;
          limit?: number;
        }
      ) => {
        const dimension = checkDimension(args.dimension);
        const ctx = ctxFor(args);
        const metrics: MetricSpec[] = [
          ...(args.metrics ?? ["visitors", "pageviews"]),
        ];
        if (args.goal !== undefined) {
          const g = site.goals.find((x) => x.id === args.goal);
          if (!g)
            throw new ArgError(
              `No goal with id ${args.goal}; the site tool lists them.`
            );
          metrics.push({ kind: "goal_completions", goal: goalDef(g) });
          metrics.push({ kind: "conversion", goal: goalDef(g) });
        }
        const propKey = dimension.startsWith("prop:")
          ? dimension.slice(5)
          : undefined;
        const { rows, total } = await q.breakdownMulti(
          ctx,
          propKey ? "prop_value" : dimension,
          metrics,
          { limit: args.limit ?? 20, propKey }
        );
        const top = rows[0];
        const first = metrics[0];
        const key = typeof first === "string" ? first : first.kind;
        return {
          summary: top
            ? `${fmtInt(total)} ${dimension} values ${rangeText(args)}; top is ${top.value || "(empty)"} with ${fmtInt(Number(top[key] ?? 0))} ${key.replace(/_/g, " ")}.`
            : `No ${dimension} values ${rangeText(args)}.`,
          data: {
            dimension,
            metrics: metrics.map((m) => (typeof m === "string" ? m : m.kind)),
            total,
            rows,
          },
        };
      }
    )
  );

  server.registerTool(
    "goals",
    {
      title: "Are people converting",
      description:
        "Every goal with completions, converting sessions, conversion rate, revenue and the median time to convert over the range; the KPI is marked.",
      inputSchema: { ...readShape },
      annotations: { readOnlyHint: true },
    },
    tool(async (args: ReadArgs) => {
      const ctx = ctxFor(args);
      const stats = await Promise.all(
        site.goals.map((g) => q.goalStats(ctx, goalDef(g)))
      );
      const rows = site.goals.map((g, i) => ({
        id: g.id,
        name: g.name,
        kind: g.kind,
        match: g.match,
        kpi: g.id === site.kpiGoalId,
        target: g.target,
        ...stats[i],
      }));
      const k = rows.find((r) => r.kpi) ?? rows[0];
      return {
        summary: k
          ? `${rows.length} ${rows.length === 1 ? "goal" : "goals"}; ${k.name}${k.kpi ? " (KPI)" : ""} completed ${fmtInt(k.completions)} times ${rangeText(args)}, ${fmtPct(k.conversion, 1)} of sessions.`
          : "This site has no goals yet.",
        data: { rows },
      };
    })
  );

  server.registerTool(
    "funnel",
    {
      title: "Where people drop",
      description:
        "Sessions reaching each step in order. A step is every session (any), a page path glob (pageview) or an event name (event).",
      inputSchema: {
        steps: z
          .array(
            z.object({
              kind: z.enum(["any", "pageview", "event"]),
              match: z.string().max(512).optional(),
            })
          )
          .min(2)
          .max(8),
        ...readShape,
      },
      annotations: { readOnlyHint: true },
    },
    tool(
      async (
        args: ReadArgs & {
          steps: { kind: "any" | "pageview" | "event"; match?: string }[];
        }
      ) => {
        const steps: FunnelStep[] = args.steps.map((s) => {
          if (s.kind === "any") return { kind: "any" };
          if (!s.match) throw new ArgError(`A ${s.kind} step needs a match.`);
          return { kind: s.kind, match: s.match };
        });
        const counts = await q.funnel(ctxFor(args), steps);
        const rows = steps.map((s, i) => ({
          step: s.kind === "any" ? "any" : `${s.kind}:${s.match}`,
          sessions: counts[i],
          share: counts[0]
            ? Math.round((counts[i] / counts[0]) * 1000) / 10
            : 0,
        }));
        const last = rows[rows.length - 1];
        return {
          summary: `${fmtInt(rows[0].sessions)} sessions entered; ${fmtInt(last.sessions)} (${fmtPct(last.share, 1)}) reached the last step ${rangeText(args)}.`,
          data: { rows },
        };
      }
    )
  );

  server.registerTool(
    "paths",
    {
      title: "How people reach an event",
      description: "The most common last pages before a custom event fires.",
      inputSchema: {
        event: z.string().min(1).max(64).describe("The event name."),
        limit: z.number().int().min(1).max(50).optional(),
        ...readShape,
      },
      annotations: { readOnlyHint: true },
    },
    tool(async (args: ReadArgs & { event: string; limit?: number }) => {
      const rows = await q.pathsTo(ctxFor(args), args.event, args.limit ?? 10);
      return {
        summary: rows[0]
          ? `The commonest path to ${args.event} ${rangeText(args)} is ${rows[0].steps.join(" → ")} (${fmtInt(rows[0].count)} times).`
          : `No ${args.event} event ${rangeText(args)}.`,
        data: { event: args.event, rows },
      };
    })
  );

  server.registerTool(
    "attention",
    {
      title: "Which pages hold and help",
      description:
        "Per page: share of the site's engaged time, read-through (share of views scrolled 75% with 10 s engaged), and influence on the KPI (conversion of sessions that saw the page before converting against those that did not).",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
        ...readShape,
      },
      annotations: { readOnlyHint: true },
    },
    tool(async (args: ReadArgs & { limit?: number }) => {
      const ctx = ctxFor(args);
      const [a, infl] = await Promise.all([
        q.attention(ctx, { limit: args.limit ?? 20 }),
        kpi ? q.influence(ctx, goalDef(kpi), { limit: args.limit ?? 20 }) : [],
      ]);
      const lift = new Map(infl.map((r) => [r.value, r.lift]));
      const rows = a.rows.map((r) => ({
        path: r.value,
        attention_share: a.siteAttentionMs
          ? Math.round((r.attention_ms / a.siteAttentionMs) * 1000) / 10
          : 0,
        attention_minutes: Math.round(r.attention_ms / 60000),
        read_through: r.read_through,
        influence: lift.get(r.value) ?? null,
      }));
      return {
        summary: rows[0]
          ? `${fmtDuration(a.siteAttentionMs)} of attention ${rangeText(args)}; ${rows[0].path} holds ${fmtPct(rows[0].attention_share, 1)} of it.`
          : `No engagement recorded ${rangeText(args)}.`,
        data: {
          site_attention_minutes: Math.round(a.siteAttentionMs / 60000),
          kpi: kpi?.name ?? null,
          rows,
        },
      };
    })
  );

  server.registerTool(
    "vitals",
    {
      title: "Is it fast",
      description:
        "The 75th percentile of each Core Web Vital over the range with its band (good, needs work, poor), and the pages with the most samples and their LCP.",
      inputSchema: {
        limit: z.number().int().min(1).max(50).optional(),
        ...readShape,
      },
      annotations: { readOnlyHint: true },
    },
    tool(async (args: ReadArgs & { limit?: number }) => {
      const ctx = ctxFor(args);
      const [v, pages] = await Promise.all([
        q.vitals(ctx),
        q.vitalsBreakdown(ctx, "path", args.limit ?? 10),
      ]);
      const metrics = RENDERED_VITALS.map((m) => ({
        metric: m,
        p75: v[m],
        display: fmtVital(m, v[m]),
        band: vitalStatus(m, v[m]),
      }));
      const bad = metrics.filter((m) => m.band === "poor" || m.band === "warn");
      return {
        summary: v.samples
          ? `${fmtInt(v.samples)} samples ${rangeText(args)}: ${metrics.map((m) => `${m.metric.toUpperCase()} ${m.display} (${m.band === "warn" ? "needs work" : m.band})`).join(", ")}${bad.length ? "" : "; all good"}.`
          : `No Web Vitals ${rangeText(args)}; the tag needs data-vitals.`,
        data: { samples: v.samples, metrics, pages },
      };
    })
  );

  server.registerTool(
    "realtime",
    {
      title: "Who is here now",
      description:
        "Visitors in the last 30 minutes, pageviews per minute, and the pages, sources and countries they are on.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    tool(async () => {
      const r = await q.realtime(buildContext(site, { range: "last_24h" }));
      return {
        summary: `${fmtInt(r.visitors_now)} ${r.visitors_now === 1 ? "visitor" : "visitors"} in the last 30 minutes, ${fmtInt(r.pageviews)} pageviews${r.pages[0] ? `, most on ${r.pages[0].value}` : ""}.`,
        data: {
          visitors_now: r.visitors_now,
          pageviews: r.pageviews,
          pageviews_previous_window: r.pageviews_prev,
          per_minute: r.per_minute,
          pages: r.pages,
          sources: r.sources,
          countries: r.countries,
          last_event_at: r.last_at,
        },
      };
    })
  );

  server.registerTool(
    "bots",
    {
      title: "What crawlers fetch",
      description:
        "Crawler hits reported by the site's server: by family (answers, training, search, social, seo, other), by crawler, by page, and the robots.txt, llms.txt and sitemap fetches. UTC days; filters do not apply.",
      inputSchema: {
        family: z.enum(FAMILIES as unknown as [Family, ...Family[]]).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        range: readShape.range,
      },
      annotations: { readOnlyHint: true },
    },
    tool(
      async (args: {
        range?: ReadArgs["range"];
        family?: Family;
        limit?: number;
      }) => {
        const ctx = buildContext(site, contextOptions({ range: args.range }));
        const [families, crawlers, pages, files] = await Promise.all([
          q.crawlerFamilies(ctx),
          q.crawlers(ctx, { family: args.family, limit: args.limit ?? 20 }),
          q.crawlerPages(ctx, { family: args.family, limit: args.limit ?? 20 }),
          q.crawlerOrientation(ctx),
        ]);
        const total = families.reduce((a, f) => a + f.hits, 0);
        const answers = families.find((f) => f.family === "answers")?.hits ?? 0;
        const training =
          families.find((f) => f.family === "training")?.hits ?? 0;
        return {
          summary: total
            ? `${fmtInt(total)} crawler hits ${rangeText(args)}: ${fmtInt(answers)} to answer someone, ${fmtInt(training)} for training${crawlers[0] ? `; ${crawlers[0].crawler} came most (${fmtInt(crawlers[0].hits)})` : ""}.`
            : `No crawler hits ${rangeText(args)}; the site's server may not be reporting them.`,
          data: {
            families: families.map((f) => ({
              ...f,
              label: FAMILY_LABEL[f.family],
            })),
            crawlers: crawlers.map(({ total: _t, ...c }) => ({
              ...c,
              last_seen: c.last_seen.toISOString(),
            })),
            pages: pages.map(({ total: _t, ...p }) => p),
            files,
          },
        };
      }
    )
  );

  server.registerTool(
    "notes",
    {
      title: "What happened when",
      description:
        "The dated notes pinned to the site inside the range, oldest first.",
      inputSchema: { range: readShape.range },
      annotations: { readOnlyHint: true },
    },
    tool(async (args: { range?: ReadArgs["range"] }) => {
      const rows = await q.notes(
        buildContext(site, contextOptions({ range: args.range }))
      );
      return {
        summary: rows.length
          ? `${rows.length} ${rows.length === 1 ? "note" : "notes"} ${rangeText(args)}; the latest: "${rows[rows.length - 1].text}".`
          : `No notes ${rangeText(args)}.`,
        data: {
          rows: rows.map((n) => ({
            id: n.id,
            at: n.at.toISOString(),
            text: n.text,
            author: n.author,
          })),
        },
      };
    })
  );

  server.registerTool(
    "add_note",
    {
      title: "Pin a note",
      description:
        "Pin a dated sentence (up to 140 characters) to the site, drawn as a marker on its charts: a deploy, a launch, a change worth remembering. Needs a key with the notes scope.",
      inputSchema: {
        text: z.string().min(1).max(140),
        at: z.string().optional().describe("ISO instant; defaults to now."),
      },
      annotations: { readOnlyHint: false, idempotentHint: false },
    },
    tool(async (args: { text: string; at?: string }) => {
      if (!hasScope(key, "notes"))
        throw new ArgError(
          "This key cannot write notes; create one with the notes scope in Settings → API keys."
        );
      const v = validateNote({ text: args.text, at: args.at });
      if (!v.ok) throw new ArgError(v.error);
      const { id } = await insertNote({
        siteId: site.siteId,
        at: v.note.at,
        text: v.note.text,
        author: `key:${key.name}`,
      });
      return {
        summary: `Pinned "${v.note.text}" at ${v.note.at.toISOString()}.`,
        data: { id, at: v.note.at.toISOString(), text: v.note.text },
      };
    })
  );

  return server;
}
