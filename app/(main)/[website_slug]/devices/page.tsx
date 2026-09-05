import { Suspense } from "react";
import { ScreenHeader } from "@/components/shell/screen-header";
import {
  Bone,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shell/skeleton";
import { screenContext } from "@/lib/screens/context";
import { getDevicesScreen } from "@/lib/screens/devices";
import { suggestValues } from "@/lib/screens/suggest";
import type { SearchInput } from "@/lib/url-state";
import {
  HistogramSection,
  MatrixSection,
  SplitSection,
  TablesSection,
} from "./_devices/sections";

/** Devices (design §8.6): split, browsers and systems with versions, the viewport histogram, the matrix. */
export default async function DevicesPage(props: {
  params: Promise<{ website_slug: string }>;
  searchParams: Promise<SearchInput>;
}) {
  const [{ website_slug: slug }, sp] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const { site, state, ctx, kpi } = await screenContext(slug, sp);
  const screen = getDevicesScreen(ctx, state, kpi, site);
  const hasFilters = state.filters.length > 0;
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 md:px-8">
      <ScreenHeader
        title="Devices"
        timezone={site.timezone}
        shortcuts={site.shortcuts}
        suggest={suggestValues.bind(null, slug)}
      />
      <Suspense fallback={<Bone className="h-10 w-full" />}>
        <SplitSection screen={screen} />
      </Suspense>
      <Suspense
        fallback={
          <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-2">
            <TableSkeleton />
            <TableSkeleton />
          </div>
        }
      >
        <TablesSection screen={screen} hasFilters={hasFilters} />
      </Suspense>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-2">
        <Suspense fallback={<ChartSkeleton height={210} />}>
          <HistogramSection screen={screen} />
        </Suspense>
        <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
          <MatrixSection screen={screen} />
        </Suspense>
      </div>
    </main>
  );
}
