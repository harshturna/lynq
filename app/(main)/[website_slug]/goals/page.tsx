import { Suspense } from "react";
import { ScreenHeader } from "@/components/shell/screen-header";
import {
  ChartSkeleton,
  StripSkeleton,
  TableSkeleton,
} from "@/components/shell/skeleton";
import { screenContext } from "@/lib/screens/context";
import { getGoalsScreen } from "@/lib/screens/goals";
import { suggestValues } from "@/lib/screens/suggest";
import type { SearchInput } from "@/lib/url-state";
import { GoalsSection, SelectedSection } from "./_goals/sections";

/** Goals (design §8.8): the goals table with the KPI star, the form, and the selected goal. */
export default async function GoalsPage(props: {
  params: Promise<{ website_slug: string }>;
  searchParams: Promise<SearchInput>;
}) {
  const [{ website_slug: slug }, sp] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const { site, state, ctx, kpi, userId } = await screenContext(slug, sp);
  const screen = getGoalsScreen(ctx, state, kpi);
  const isGuest = userId === process.env.GUEST_USER_ID;
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 md:px-8">
      <ScreenHeader
        title="Goals"
        timezone={site.timezone}
        shortcuts={site.shortcuts}
        suggest={suggestValues.bind(null, slug)}
      />
      <Suspense fallback={<TableSkeleton rows={4} columns={5} />}>
        <GoalsSection screen={screen} slug={slug} isGuest={isGuest} />
      </Suspense>
      {screen.sel !== undefined && (
        <Suspense
          fallback={
            <div className="flex flex-col gap-7">
              <StripSkeleton tiles={4} />
              <ChartSkeleton height={180} />
            </div>
          }
        >
          <SelectedSection screen={screen} />
        </Suspense>
      )}
    </main>
  );
}
