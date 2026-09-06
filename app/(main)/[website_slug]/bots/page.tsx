import { Suspense } from "react";
import { RangePicker } from "@/components/shell/range-picker";
import { ScreenHeader } from "@/components/shell/screen-header";
import { TableSkeleton } from "@/components/shell/skeleton";
import { getBotsScreen } from "@/lib/screens/bots";
import { screenContext } from "@/lib/screens/context";
import { suggestValues } from "@/lib/screens/suggest";
import type { SearchInput } from "@/lib/url-state";
import { LeadSection, PagesSection } from "./_bots/sections";

/**
 * Bots (docs/design/bot-traffic.md §6, D-018): crawler hits by family,
 * crawler and page. No compare and no filters: a crawler hit carries none
 * of the dimensions a filter names, and days are UTC, not the site's zone.
 */
export default async function BotsPage(props: {
  params: Promise<{ website_slug: string }>;
  searchParams: Promise<SearchInput>;
}) {
  const [{ website_slug: slug }, sp] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const { site, state, ctx } = await screenContext(slug, sp);
  const screen = getBotsScreen(ctx, state);
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 md:px-8">
      <ScreenHeader
        title="Bots"
        timezone={site.timezone}
        shortcuts={site.shortcuts}
        suggest={suggestValues.bind(null, slug)}
        pickers={false}
        filters={false}
        subtitle="Crawler requests reported by your server · UTC days · each crawler is what it claimed to be"
        controls={<RangePicker timezone={site.timezone} />}
      />
      <Suspense fallback={<TableSkeleton />}>
        <LeadSection screen={screen} />
      </Suspense>
      <Suspense
        fallback={
          <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-2">
            <TableSkeleton />
            <TableSkeleton />
          </div>
        }
      >
        <PagesSection screen={screen} />
      </Suspense>
    </main>
  );
}
