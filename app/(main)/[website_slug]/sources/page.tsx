import { Suspense } from "react";
import { ScreenHeader } from "@/components/shell/screen-header";
import {
  ChartSkeleton,
  StripSkeleton,
  TableSkeleton,
} from "@/components/shell/skeleton";
import { screenContext } from "@/lib/screens/context";
import { getSourcesScreen } from "@/lib/screens/sources";
import { suggestValues } from "@/lib/screens/suggest";
import type { SearchInput } from "@/lib/url-state";
import {
  QuadrantSection,
  StripSection,
  TablesSection,
} from "./_sources/sections";

/** Sources (design §8.4): the strip by KPI state, the quadrant, three entry-attributed tables. */
export default async function SourcesPage(props: {
  params: Promise<{ website_slug: string }>;
  searchParams: Promise<SearchInput>;
}) {
  const [{ website_slug: slug }, sp] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const { site, state, ctx, kpi } = await screenContext(slug, sp);
  const screen = getSourcesScreen(ctx, state, kpi);
  const hasFilters = state.filters.length > 0;
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 md:px-8">
      <ScreenHeader
        title="Sources"
        timezone={site.timezone}
        shortcuts={site.shortcuts}
        suggest={suggestValues.bind(null, slug)}
      />
      <Suspense fallback={<StripSkeleton tiles={4} />}>
        <StripSection screen={screen} />
      </Suspense>
      <Suspense fallback={<ChartSkeleton height={300} />}>
        <QuadrantSection screen={screen} />
      </Suspense>
      <Suspense
        fallback={
          <div className="grid gap-8 min-[1000px]:grid-cols-2">
            <TableSkeleton />
            <TableSkeleton />
          </div>
        }
      >
        <TablesSection screen={screen} hasFilters={hasFilters} />
      </Suspense>
    </main>
  );
}
