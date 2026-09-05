import { escapeLike, type Query } from "./builder";

/**
 * The filter compiler (design §9.3). OR within a dimension, AND across
 * dimensions. Row dimensions become predicates on analytics.events rows;
 * session dimensions become a HAVING on the session CTE. Dimension names come
 * from the allow-lists below and nothing else reaches the SQL text.
 */
export type FilterOp = "is" | "is_not" | "contains";

export type Filter = {
  dimension: string; // a RowDimension, a SessionDimension, or "prop:<key>"
  op: FilterOp;
  values: string[];
};

/** Row dimensions: column on analytics.events, or an expression over columns. */
export const ROW_DIMENSIONS = {
  path: "path",
  hostname: "hostname",
  referrer: "referrer",
  source: "source",
  channel: "channel",
  utm_source: "utm_source",
  utm_medium: "utm_medium",
  utm_campaign: "utm_campaign",
  utm_term: "utm_term",
  utm_content: "utm_content",
  country: "country",
  region: "region",
  city: "city",
  device: "device",
  browser: "browser",
  browser_major: "browser_major::text",
  os: "os",
  os_version: "os_version",
  language: "language",
  screen_size: "(screen_width::text || 'x' || screen_height::text)",
  event_name: "name",
} as const;
export type RowDimension = keyof typeof ROW_DIMENSIONS;

/** Dimensions constant within a session, so session metrics may be grouped by them. */
export const SESSION_CONSTANT: readonly RowDimension[] = [
  "hostname",
  "referrer",
  "source",
  "channel",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "country",
  "region",
  "city",
  "device",
  "browser",
  "browser_major",
  "os",
  "os_version",
  "language",
  "screen_size",
];

/** Session dimensions: columns of the session CTE. */
export const SESSION_DIMENSIONS = {
  entry_path: "entry_path",
  exit_path: "exit_path",
  bounced: "bounced",
} as const;
export type SessionDimension = keyof typeof SESSION_DIMENSIONS;

export type Compiled = {
  /** predicate on an events row, alias `e` */
  rowWhere: string;
  /** predicate on a session CTE row, alias `s` */
  sessionHaving: string;
  hasRow: boolean;
  hasSession: boolean;
};

export function isRowDimension(d: string): d is RowDimension {
  return Object.hasOwn(ROW_DIMENSIONS, d);
}
export function isSessionDimension(d: string): d is SessionDimension {
  return Object.hasOwn(SESSION_DIMENSIONS, d);
}
export function propKey(d: string): string | null {
  return d.startsWith("prop:") && d.length > 5 && d.length <= 37
    ? d.slice(5)
    : null;
}

/** The SQL expression for a row dimension on alias `e`. */
export function rowExpr(dimension: RowDimension, alias = "e"): string {
  const col = ROW_DIMENSIONS[dimension];
  if (col.startsWith("("))
    return col.replace(/\b(screen_width|screen_height)\b/g, `${alias}.$1`);
  return `${alias}.${col.replace("::text", "")}${col.endsWith("::text") ? "::text" : ""}`;
}

function oneRow(
  q: Query,
  dimension: RowDimension,
  op: FilterOp,
  values: string[]
): string {
  const expr = rowExpr(dimension);
  const guard = dimension === "event_name" ? "e.event = 'custom' and " : "";
  if (op === "contains") {
    const parts = values.map(
      (v) => `${expr} ilike ${q.p(`%${escapeLike(v)}%`)} escape '\\'`
    );
    return `(${guard}(${parts.join(" or ")}))`;
  }
  const inList = `${expr} = any(${q.p(values)}::text[])`;
  return op === "is" ? `(${guard}${inList})` : `(not (${guard}${inList}))`;
}

function oneProp(
  q: Query,
  key: string,
  op: FilterOp,
  values: string[]
): string {
  if (op === "contains") {
    const parts = values.map(
      (v) =>
        `(e.props ->> ${q.p(key)}) ilike ${q.p(`%${escapeLike(v)}%`)} escape '\\'`
    );
    return `(e.event = 'custom' and e.props ? ${q.p(key)} and (${parts.join(" or ")}))`;
  }
  const parts = values.map(
    (v) => `e.props @> jsonb_build_object(${q.p(key)}::text, ${q.p(v)}::text)`
  );
  const eq = `(e.event = 'custom' and (${parts.join(" or ")}))`;
  return op === "is" ? eq : `(not ${eq})`;
}

function oneSession(
  q: Query,
  dimension: SessionDimension,
  op: FilterOp,
  values: string[]
): string {
  const col = `s.${SESSION_DIMENSIONS[dimension]}`;
  if (dimension === "bounced") {
    const want = values.some((v) => v === "true" || v === "1");
    return op === "is_not"
      ? `(${col} <> ${q.p(want)})`
      : `(${col} = ${q.p(want)})`;
  }
  if (op === "contains") {
    const parts = values.map(
      (v) => `${col} ilike ${q.p(`%${escapeLike(v)}%`)} escape '\\'`
    );
    return `(${parts.join(" or ")})`;
  }
  const inList = `${col} = any(${q.p(values)}::text[])`;
  return op === "is" ? `(${inList})` : `(not (${inList}))`;
}

export function compileFilters(q: Query, filters: Filter[]): Compiled {
  const row: string[] = [];
  const session: string[] = [];
  for (const f of filters) {
    if (!f.values.length) continue;
    const values = f.values.map((v) => String(v).slice(0, 512));
    const key = propKey(f.dimension);
    if (key) row.push(oneProp(q, key, f.op, values));
    else if (isRowDimension(f.dimension))
      row.push(oneRow(q, f.dimension, f.op, values));
    else if (isSessionDimension(f.dimension))
      session.push(oneSession(q, f.dimension, f.op, values));
    else throw new Error(`unknown dimension ${f.dimension}`);
  }
  return {
    rowWhere: row.length ? row.join(" and ") : "true",
    sessionHaving: session.length ? session.join(" and ") : "true",
    hasRow: row.length > 0,
    hasSession: session.length > 0,
  };
}

/** Identity-keyed queries must never treat the anonymous sentinel as a user. */
export const IDENTITY_WHERE = "e.user_hash <> 0";
