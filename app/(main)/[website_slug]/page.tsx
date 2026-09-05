import { Suspense } from "react";
import {
  Bone,
  ChartSkeleton,
  StripSkeleton,
  TableSkeleton,
} from "@/components/shell/skeleton";
import { buildContext } from "@/lib/query/authorize";
import { loadKpi } from "@/lib/screens/kpi";
import { getOverviewScreen } from "@/lib/screens/overview";
import { resolveSite } from "@/lib/screens/site";
import { suggestValues } from "@/lib/screens/suggest";
import { parseSearch, type SearchInput } from "@/lib/url-state";
import { OverviewHeader } from "./_overview/header";
import {
  LeadSection,
  TablesSection,
  VitalsSection,
} from "./_overview/sections";

/**
 * The Overview (design §8.1): the URL is the state, the site is authorised
 * once, every query starts at once, and each section streams in under its
 * own boundary so the numbers paint first (§10).
 */
export default async function OverviewPage(props: {
  params: Promise<{ website_slug: string }>;
  searchParams: Promise<SearchInput>;
}) {
  const [{ website_slug: slug }, sp] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const { site, website } = await resolveSite(slug);
  const state = parseSearch(sp);
  const ctx = buildContext(site, {
    range: state.range,
    compare: state.compare === "none" ? undefined : state.compare,
    filters: state.filters,
  });
  const kpi = await loadKpi(site, ctx);
  const screen = getOverviewScreen(ctx, state, kpi);

  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 md:px-8">
      <OverviewHeader
        timezone={site.timezone}
        shortcuts={site.shortcuts}
        suggest={suggestValues.bind(null, slug)}
      />
      <Suspense
        fallback={
          <div className="flex flex-col gap-7">
            <StripSkeleton tiles={6} />
            <ChartSkeleton height={220} />
          </div>
        }
      >
        <LeadSection
          screen={screen}
          slug={slug}
          siteUrl={website.url}
          hasFilters={state.filters.length > 0}
        />
      </Suspense>
      <Suspense
        fallback={
          <div className="grid gap-8 min-[1000px]:grid-cols-2">
            <TableSkeleton />
            <TableSkeleton />
            <TableSkeleton />
          </div>
        }
      >
        <TablesSection screen={screen} hasFilters={state.filters.length > 0} />
      </Suspense>
      <Suspense fallback={<Bone className="h-6 w-80" />}>
        <VitalsSection screen={screen} slug={slug} />
      </Suspense>
    </main>
  );
}
