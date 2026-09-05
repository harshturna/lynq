import "server-only";
import { type BuiltContext, buildContext } from "@/lib/query/authorize";
import { parseSearch, type SearchInput, type ViewState } from "@/lib/url-state";
import { type Kpi, loadKpi } from "./kpi";
import { type ResolvedSite, resolveSite } from "./site";

/**
 * What every screen starts from (design §10): the authorised site, the URL
 * state, the query context built from it, and the KPI probe.
 */
export type ScreenContext = ResolvedSite & {
  state: ViewState;
  ctx: BuiltContext;
  kpi: Kpi;
};

export async function screenContext(
  slug: string,
  sp: SearchInput
): Promise<ScreenContext> {
  const resolved = await resolveSite(slug);
  const state = parseSearch(sp);
  const ctx = buildContext(resolved.site, {
    range: state.range,
    compare: state.compare === "none" ? undefined : state.compare,
    filters: state.filters,
  });
  const kpi = await loadKpi(resolved.site, ctx);
  return { ...resolved, state, ctx, kpi };
}
