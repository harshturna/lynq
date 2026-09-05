import { Suspense } from "react";
import { ScreenHeader } from "@/components/shell/screen-header";
import { ChartSkeleton, TableSkeleton } from "@/components/shell/skeleton";
import { screenContext } from "@/lib/screens/context";
import { getPagesScreen } from "@/lib/screens/pages";
import { suggestValues } from "@/lib/screens/suggest";
import type { SearchInput } from "@/lib/url-state";
import { SelectedSection, TableSection } from "./_pages/sections";

/** Pages (design §8.3): treemap, the table with All / Entry / Exit, the selected page below. */
export default async function PagesPage(props: {
  params: Promise<{ website_slug: string }>;
  searchParams: Promise<SearchInput>;
}) {
  const [{ website_slug: slug }, sp] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const { site, state, ctx, kpi } = await screenContext(slug, sp);
  const screen = getPagesScreen(ctx, state, kpi);
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 md:px-8">
      <ScreenHeader
        title="Pages"
        timezone={site.timezone}
        shortcuts={site.shortcuts}
        suggest={suggestValues.bind(null, slug)}
      />
      <Suspense
        fallback={
          <div className="flex flex-col gap-7">
            <ChartSkeleton height={240} />
            <TableSkeleton rows={8} columns={6} />
          </div>
        }
      >
        <TableSection
          screen={screen}
          slug={slug}
          hasFilters={state.filters.length > 0}
        />
      </Suspense>
      {state.sel && (
        <Suspense fallback={<ChartSkeleton height={160} />}>
          <SelectedSection screen={screen} slug={slug} />
        </Suspense>
      )}
    </main>
  );
}
