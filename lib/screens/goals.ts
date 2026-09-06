import "server-only";
import type { Point } from "@/lib/charts/format";
import type { ChartNote } from "@/lib/charts/notes";
import { sql } from "@/lib/db";
import type { BuiltContext } from "@/lib/query/authorize";
import type { GoalDef, GoalStats } from "@/lib/query/goals";
import type { SessionSummary } from "@/lib/query/primitives";
import {
  breakdownMulti,
  funnel,
  goalStats,
  goalTimeseries,
  notes as notesOf,
  sessionList,
  summary,
} from "@/lib/query/run";
import type { ViewState } from "@/lib/url-state";
import type { Kpi, KpiGoal } from "./kpi";
import { toNotes } from "./overview";
import { type Section, settle } from "./settle";

/**
 * The Goals screen (design §8.8): every goal with its stats and a trend, the
 * KPI star; the selected goal's tiles, funnel, conversion by channel and
 * trend.
 */
export type GoalRow = KpiGoal & {
  stats: GoalStats;
  previous: GoalStats | null;
  spark: number[];
};

export type SelectedGoal = {
  goal: KpiGoal;
  stats: GoalStats;
  previous: GoalStats | null;
  /** Sessions in the range, then sessions that completed. */
  funnel: { key: string; label: string; count: number }[];
  channels: { key: string; label: string; value: number }[];
  trend: { current: Point[]; previous: Point[] | null; notes: ChartNote[] };
  /** The newest sessions that completed the goal (TICKET-074). */
  recent: SessionSummary[];
};

export const RECENT_SESSIONS = 20;

export type GoalsScreen = {
  compare: boolean;
  kpi: Kpi;
  granularity: BuiltContext["granularity"];
  timezone: string;
  sel: number | undefined;
  goals: Promise<Section<GoalRow[]>>;
  selected: Promise<Section<SelectedGoal | null>>;
};

export async function listGoals(siteId: number): Promise<KpiGoal[]> {
  const rows = await sql<
    {
      id: number;
      name: string;
      kind: "pageview" | "event";
      match: string;
      revenue: boolean;
      target: number | null;
    }[]
  >`
    select id, name, kind, match, revenue, target
    from public.goals where site_id = ${siteId} order by created_at, id`;
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    kind: r.kind,
    match: r.match,
    revenue: r.revenue,
    target: r.target === null ? null : Number(r.target),
  }));
}

const toPoints = (s: { bucket: Date; value: number }[]): Point[] =>
  s.map((p) => ({ t: p.bucket.toISOString(), v: p.value }));

export function getGoalsScreen(
  ctx: BuiltContext,
  state: ViewState,
  kpi: Kpi
): GoalsScreen {
  const prev: BuiltContext | null = ctx.compare
    ? { ...ctx, range: ctx.compare, compare: undefined }
    : null;
  const sel =
    state.sel && /^\d{1,10}$/.test(state.sel) ? Number(state.sel) : undefined;
  const goalsP = listGoals(ctx.siteId);

  const rowsFor = async (): Promise<GoalRow[]> => {
    const goals = await goalsP;
    return Promise.all(
      goals.map(async (g) => {
        const def: GoalDef = { id: g.id, kind: g.kind, match: g.match };
        const [stats, before, series] = await Promise.all([
          goalStats(ctx, def),
          prev ? goalStats(prev, def) : null,
          goalTimeseries(ctx, def, ctx.granularity),
        ]);
        return {
          ...g,
          stats,
          previous: before,
          spark: series.map((p) => p.value),
        };
      })
    );
  };

  const selected = async (): Promise<SelectedGoal | null> => {
    if (sel === undefined) return null;
    const goals = await goalsP;
    const g = goals.find((x) => x.id === sel);
    if (!g) return null;
    const def: GoalDef = { id: g.id, kind: g.kind, match: g.match };
    const [stats, before, steps, channels, cur, prevSeries, sum, n, recent] =
      await Promise.all([
        goalStats(ctx, def),
        prev ? goalStats(prev, def) : null,
        funnel(ctx, [{ kind: "any" }, { kind: g.kind, match: g.match }]),
        breakdownMulti(
          ctx,
          "entry_channel",
          ["sessions", { kind: "conversion", goal: def }],
          { limit: 12 }
        ),
        goalTimeseries(ctx, def, ctx.granularity),
        prev ? goalTimeseries(prev, def, ctx.granularity) : null,
        summary({ ...ctx, compare: undefined }),
        notesOf(ctx).then(toNotes),
        sessionList(ctx, { goal: def, limit: RECENT_SESSIONS }),
      ]);
    return {
      goal: g,
      stats,
      previous: before,
      funnel: [
        {
          key: "visited",
          label: "Visited the site",
          count: sum.current.sessions,
        },
        {
          key: "reached",
          label: g.kind === "pageview" ? `Saw ${g.match}` : `Fired ${g.match}`,
          count: steps[1] ?? 0,
        },
        {
          key: "completed",
          label: "Completed",
          count: stats.converting_sessions,
        },
      ],
      channels: channels.rows.map((r) => ({
        key: r.value,
        label: r.value || "Direct",
        value: Number(r.conversion ?? 0),
      })),
      trend: {
        current: toPoints(cur),
        previous: prevSeries ? toPoints(prevSeries) : null,
        notes: n,
      },
      recent,
    };
  };

  return {
    compare: prev !== null,
    kpi,
    granularity: ctx.granularity,
    timezone: ctx.timezone,
    sel,
    goals: settle("goals.list", rowsFor()),
    selected: settle("goals.selected", selected()),
  };
}
