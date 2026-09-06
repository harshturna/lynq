import { z } from "zod";
import {
  type Filter,
  isRowDimension,
  isSessionDimension,
  propKey,
  ROW_DIMENSIONS,
  SESSION_DIMENSIONS,
} from "@/lib/query/filters";
import { ROW_METRICS, SESSION_METRICS } from "@/lib/query/primitives";
import type { CompareMode, Granularity, Range } from "@/lib/query/ranges";

/**
 * The arguments every reading tool shares (docs/design/agents-mcp-and-cli.md
 * §4), as zod shapes the MCP server publishes as JSON schema and as the
 * parsing that turns them into a buildContext call. Pure, so it is tested
 * without a server. Dimension and metric names come from the same
 * allow-lists the dashboard uses and nothing else reaches the query layer.
 */
export const RANGE_PRESETS = [
  "today",
  "yesterday",
  "last_24h",
  "last_7d",
  "last_30d",
  "last_90d",
  "last_12mo",
  "this_week",
  "this_month",
] as const;

export const DIMENSIONS = [
  ...(Object.keys(ROW_DIMENSIONS) as (keyof typeof ROW_DIMENSIONS)[]),
  ...(Object.keys(SESSION_DIMENSIONS) as (keyof typeof SESSION_DIMENSIONS)[]),
] as const;

export const METRICS = [...ROW_METRICS, ...SESSION_METRICS, "revenue"] as const;
export type ToolMetric = (typeof METRICS)[number];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const rangeSchema = z
  .union([
    z.enum(RANGE_PRESETS),
    z.object({
      from: z.string().regex(DATE, "YYYY-MM-DD"),
      to: z.string().regex(DATE, "YYYY-MM-DD"),
    }),
  ])
  .describe(
    `A preset (${RANGE_PRESETS.join(", ")}) or {from, to} as YYYY-MM-DD dates in the site's timezone, inclusive. Default last_30d.`
  );

export const filterSchema = z.object({
  dimension: z
    .string()
    .describe(
      `One of ${DIMENSIONS.join(", ")}, or prop:<key> for a custom event property.`
    ),
  op: z.enum(["is", "is_not", "contains"]).default("is"),
  values: z.array(z.string().min(1).max(512)).min(1).max(20),
});

export const filtersSchema = z
  .array(filterSchema)
  .max(10)
  .describe(
    "Filters, OR within a dimension and AND across dimensions, as on the dashboard."
  );

export const compareSchema = z
  .enum(["previous_period", "previous_year"])
  .describe("Also return the same numbers for the period before.");

export const granularitySchema = z.enum(["hour", "day", "week", "month"]);

/** The shape every reading tool spreads into its input schema. */
export const readShape = {
  range: rangeSchema.optional(),
  filters: filtersSchema.optional(),
};

export type ReadArgs = {
  range?: Range;
  filters?: Filter[];
  compare?: CompareMode;
  granularity?: Granularity;
};

export function isDimension(d: string): boolean {
  return isRowDimension(d) || isSessionDimension(d) || propKey(d) !== null;
}

export class ArgError extends Error {}

/**
 * Validated arguments to what buildContext takes. The zod schema has
 * already checked shape; this checks the names the schema could not, and
 * says which one is wrong in a sentence an agent can act on.
 */
export function contextOptions(args: {
  range?: Range;
  filters?: Filter[];
  compare?: CompareMode;
}): { range: Range; filters: Filter[]; compare?: CompareMode } {
  const filters: Filter[] = [];
  for (const f of args.filters ?? []) {
    if (!isDimension(f.dimension))
      throw new ArgError(
        `Unknown filter dimension "${f.dimension}". Use one of ${DIMENSIONS.join(", ")}, or prop:<key>.`
      );
    filters.push({
      dimension: f.dimension,
      op: f.op,
      values: [...new Set(f.values)],
    });
  }
  const range = args.range ?? "last_30d";
  if (typeof range === "object" && range.from > range.to)
    throw new ArgError("The range's from date is after its to date.");
  return { range, filters, compare: args.compare };
}

export function checkDimension(d: string): string {
  if (!isDimension(d))
    throw new ArgError(
      `Unknown dimension "${d}". Use one of ${DIMENSIONS.join(", ")}, or prop:<key>.`
    );
  return d;
}
