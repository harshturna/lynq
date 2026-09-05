import { Suspense } from "react";
import { ScreenHeader } from "@/components/shell/screen-header";
import { ChartSkeleton, TableSkeleton } from "@/components/shell/skeleton";
import { screenContext } from "@/lib/screens/context";
import { getEventsScreen } from "@/lib/screens/events";
import { suggestValues } from "@/lib/screens/suggest";
import type { SearchInput } from "@/lib/url-state";
import { SelectedSection, TableSection } from "./_events/sections";

/** Events (design §8.7): the table, then the selected event's trend, properties, occurrences and paths. */
export default async function EventsPage(props: {
  params: Promise<{ website_slug: string }>;
  searchParams: Promise<SearchInput>;
}) {
  const [{ website_slug: slug }, sp] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const { site, state, ctx, kpi } = await screenContext(slug, sp);
  const screen = getEventsScreen(ctx, state, kpi);
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 md:px-8">
      <ScreenHeader
        title="Events"
        timezone={site.timezone}
        shortcuts={site.shortcuts}
        suggest={suggestValues.bind(null, slug)}
      />
      <Suspense fallback={<TableSkeleton rows={6} columns={5} />}>
        <TableSection screen={screen} hasFilters={state.filters.length > 0} />
      </Suspense>
      {state.sel && (
        <Suspense fallback={<ChartSkeleton height={160} />}>
          <SelectedSection screen={screen} />
        </Suspense>
      )}
    </main>
  );
}
