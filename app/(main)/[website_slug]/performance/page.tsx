import { Suspense } from "react";
import { ScreenHeader } from "@/components/shell/screen-header";
import {
  ChartSkeleton,
  StripSkeleton,
  TableSkeleton,
} from "@/components/shell/skeleton";
import { screenContext } from "@/lib/screens/context";
import { getPerformanceScreen } from "@/lib/screens/performance";
import { suggestValues } from "@/lib/screens/suggest";
import type { SearchInput } from "@/lib/url-state";
import { DeviceSegment } from "./_performance/device-segment";
import {
  ChartSection,
  DistributionSection,
  PagesSection,
  SelectedSection,
  StripSection,
} from "./_performance/sections";

/** Performance (design §8.9): p75 strip, LCP by device, worst-first pages, what is slow, distribution. */
export default async function PerformancePage(props: {
  params: Promise<{ website_slug: string }>;
  searchParams: Promise<SearchInput>;
}) {
  const [{ website_slug: slug }, sp] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const { site, state, ctx, kpi } = await screenContext(slug, sp);
  const screen = getPerformanceScreen(ctx, state, kpi);
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 md:px-8">
      <ScreenHeader
        title="Performance"
        timezone={site.timezone}
        shortcuts={site.shortcuts}
        suggest={suggestValues.bind(null, slug)}
        controls={<DeviceSegment />}
      />
      <Suspense fallback={<StripSkeleton tiles={5} />}>
        <StripSection screen={screen} />
      </Suspense>
      <Suspense fallback={<ChartSkeleton height={220} />}>
        <ChartSection screen={screen} />
      </Suspense>
      <Suspense fallback={<TableSkeleton rows={8} columns={6} />}>
        <PagesSection screen={screen} hasFilters={state.filters.length > 0} />
      </Suspense>
      {state.sel && (
        <Suspense fallback={<TableSkeleton rows={4} columns={3} />}>
          <SelectedSection screen={screen} />
        </Suspense>
      )}
      <Suspense fallback={<ChartSkeleton height={200} />}>
        <DistributionSection screen={screen} />
      </Suspense>
    </main>
  );
}
