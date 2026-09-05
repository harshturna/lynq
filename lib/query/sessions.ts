import type { Query } from "./builder";
import type { Compiled } from "./filters";

/**
 * The one session definition (design §6.3), as a materialised CTE every
 * session metric reads from. A session is (visitor_id, session_id); its
 * metrics are computed over all of its rows in the range, and it is selected
 * when at least one of its rows matches the row filters (`matched`) and its
 * aggregate satisfies the session filters.
 */
export const BOUNCE_MS = 10_000;

export type SessionScope = {
  siteId: number;
  from: Date;
  toExclusive: Date;
  includeSuspect: boolean;
  /** the window column: ts (default) or received_at for the realtime screen (design §9.4) */
  column?: "ts" | "received_at";
};

/**
 * The session's entry attribution (design §9.1): the referrer, source, channel
 * and UTM fields of its first pageview, as one jsonb column so the CTE pays
 * one ordered aggregate for all eight. `min()` over these columns would return
 * '' for every session, because only the first pageview carries them.
 */
export const ENTRY_FIELDS = [
  "referrer",
  "source",
  "channel",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;
const ENTRY_COLUMN = `(array_agg(jsonb_build_object(${ENTRY_FIELDS.map((f) => `'${f}', e.${f}`).join(", ")}) order by e.ts, e.seq, e.pageview_id) filter (where e.event = 'pageview'))[1] as entry`;

/**
 * `extra` adds session-constant dimension columns as `min(col) as <name>`.
 * The entry column is added when a session filter needs it or `entry` is set.
 */
export function sessionCte(
  q: Query,
  scope: SessionScope,
  filters: Compiled,
  extra: { name: string; expr: string }[] = [],
  opts: { entry?: boolean } = {}
): string {
  const extraCols =
    extra.map((x) => `, min(${x.expr}) as ${x.name}`).join("") +
    (opts.entry || filters.needsEntry ? `,\n    ${ENTRY_COLUMN}` : "");
  return `sess as materialized (
  select e.visitor_id, e.session_id,
    min(e.ts) as started,
    coalesce(sum(e.engaged_ms), 0)::bigint as duration_ms,
    (max(e.ts) - min(e.ts)) as time_on_site,
    count(*) filter (where e.event = 'pageview')::int as pageviews,
    count(*) filter (where e.event = 'custom')::int as customs,
    (array_agg(e.path order by e.ts, e.seq, e.pageview_id) filter (where e.event = 'pageview'))[1] as entry_path,
    (array_agg(e.path order by e.ts desc, e.seq desc, e.pageview_id desc) filter (where e.event = 'pageview'))[1] as exit_path,
    (count(*) filter (where e.event = 'pageview') = 1
      and coalesce(sum(e.engaged_ms), 0) < ${BOUNCE_MS}
      and count(*) filter (where e.event = 'custom') = 0) as bounced${extraCols}
  from analytics.events e
  where e.site_id = ${q.p(scope.siteId)}
    and e.${scope.column ?? "ts"} >= ${q.p(scope.from)} and e.${scope.column ?? "ts"} < ${q.p(scope.toExclusive)}
    ${scope.includeSuspect ? "" : "and not e.suspect"}
  group by 1, 2
  having bool_or(${filters.rowWhere})
)`;
}

/** The session-filter predicate, applied where the CTE is consumed as alias `s`. */
export function sessionWhere(filters: Compiled): string {
  return filters.hasSession ? filters.sessionHaving : "true";
}
