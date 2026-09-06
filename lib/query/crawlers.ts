import { type Family, isFamily, ORIENTATION } from "@/lib/crawler-families";
import { utcDay } from "@/lib/ingest/hash";
import { type Compiled, Query } from "./builder";
import type { QueryContext } from "./primitives";

/**
 * The Bots screen's reads (docs/design/bot-traffic.md §6, D-018) over
 * `analytics.crawler_days`, which is keyed by UTC day: the range is folded
 * to the UTC days it touches, and the site's filters do not apply, because
 * a crawler hit has no country, device or referrer.
 */
export type FamilyRow = {
  family: Family;
  hits: number;
  crawlers: number;
  pages: number;
};

export type CrawlerRow = {
  crawler: string;
  family: Family;
  hits: number;
  /** Distinct paths touched, orientation files included. */
  pages: number;
  last_seen: Date;
  total: number;
};

export type CrawlerPageRow = {
  path: string;
  hits: number;
  crawlers: number;
  total: number;
};

export type OrientationRow = {
  path: string;
  hits: number;
  crawlers: number;
};

function days(w: QueryContext["range"]): { from: string; to: string } {
  return {
    from: utcDay(w.from),
    to: utcDay(new Date(w.toExclusive.getTime() - 1)),
  };
}

function scope(q: Query, ctx: QueryContext, family?: Family | null): string {
  const d = days(ctx.range);
  const parts = [
    `c.site_id = ${q.p(ctx.siteId)}`,
    `c.day between ${q.p(d.from)} and ${q.p(d.to)}`,
  ];
  if (family && isFamily(family)) parts.push(`c.family = ${q.p(family)}`);
  return parts.join(" and ");
}

const clamp = (n: number | undefined, d: number) =>
  Math.min(Math.max(n ?? d, 1), 1000);

export function crawlerFamiliesQuery(ctx: QueryContext): Compiled {
  const q = new Query();
  return {
    text: `select c.family,
  sum(c.hits)::bigint as hits,
  count(distinct c.crawler)::int as crawlers,
  count(distinct c.path)::int as pages
from analytics.crawler_days c
where ${scope(q, ctx)}
group by 1
order by hits desc, family`,
    params: q.params,
  };
}

export function crawlersQuery(
  ctx: QueryContext,
  opts: { family?: Family | null; limit?: number } = {}
): Compiled {
  const q = new Query();
  return {
    text: `select c.crawler, c.family,
  sum(c.hits)::bigint as hits,
  count(distinct c.path)::int as pages,
  max(c.last_seen) as last_seen,
  count(*) over ()::int as total
from analytics.crawler_days c
where ${scope(q, ctx, opts.family)}
group by 1, 2
order by hits desc, crawler
limit ${q.p(clamp(opts.limit, 50))}`,
    params: q.params,
  };
}

/** Pages ranked by crawler hits; the orientation files are listed separately. */
export function crawlerPagesQuery(
  ctx: QueryContext,
  opts: { family?: Family | null; limit?: number } = {}
): Compiled {
  const q = new Query();
  return {
    text: `select c.path,
  sum(c.hits)::bigint as hits,
  count(distinct c.crawler)::int as crawlers,
  count(*) over ()::int as total
from analytics.crawler_days c
where ${scope(q, ctx, opts.family)}
  and c.path <> all(${q.p([...ORIENTATION])}::text[])
group by 1
order by hits desc, path
limit ${q.p(clamp(opts.limit, 50))}`,
    params: q.params,
  };
}

export function crawlerOrientationQuery(ctx: QueryContext): Compiled {
  const q = new Query();
  return {
    text: `select c.path,
  sum(c.hits)::bigint as hits,
  count(distinct c.crawler)::int as crawlers
from analytics.crawler_days c
where ${scope(q, ctx)}
  and c.path = any(${q.p([...ORIENTATION])}::text[])
group by 1
order by hits desc, path`,
    params: q.params,
  };
}
