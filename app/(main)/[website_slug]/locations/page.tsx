import { Suspense } from "react";
import { ScreenHeader } from "@/components/shell/screen-header";
import { ChartSkeleton, TableSkeleton } from "@/components/shell/skeleton";
import { screenContext } from "@/lib/screens/context";
import { getLocationsScreen } from "@/lib/screens/locations";
import { suggestValues } from "@/lib/screens/suggest";
import type { SearchInput } from "@/lib/url-state";
import { HeatmapSection, TablesSection } from "./_locations/sections";

/** Locations (design §8.5): countries, the selected country's regions and cities, the heatmap, languages. */
export default async function LocationsPage(props: {
  params: Promise<{ website_slug: string }>;
  searchParams: Promise<SearchInput>;
}) {
  const [{ website_slug: slug }, sp] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const { site, state, ctx, kpi } = await screenContext(slug, sp);
  const screen = getLocationsScreen(ctx, state, kpi);
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 md:px-8">
      <ScreenHeader
        title="Locations"
        timezone={site.timezone}
        shortcuts={site.shortcuts}
        suggest={suggestValues.bind(null, slug)}
      />
      <Suspense
        fallback={
          <div className="grid gap-8 min-[1000px]:grid-cols-3">
            <TableSkeleton />
            <TableSkeleton />
            <TableSkeleton />
          </div>
        }
      >
        <TablesSection screen={screen} hasFilters={state.filters.length > 0} />
      </Suspense>
      <Suspense fallback={<ChartSkeleton height={300} />}>
        <HeatmapSection screen={screen} />
      </Suspense>
    </main>
  );
}
