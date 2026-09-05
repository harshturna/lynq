import type { PagesScreen } from "@/lib/screens/pages";
import { SelectedPagePanel } from "./selected";
import { PagesTable } from "./table";

export async function TableSection({
  screen,
  slug,
  hasFilters,
}: {
  screen: PagesScreen;
  slug: string;
  hasFilters: boolean;
}) {
  const [table, trends] = await Promise.all([screen.table, screen.trends]);
  return (
    <PagesTable
      slug={slug}
      view={screen.view}
      compare={screen.compare}
      hasFilters={hasFilters}
      granularity={screen.granularity}
      timezone={screen.timezone}
      table={table}
      trends={trends.ok ? trends.data : {}}
    />
  );
}

export async function SelectedSection({
  screen,
  slug,
}: {
  screen: PagesScreen;
  slug: string;
}) {
  const selected = await screen.selected;
  return (
    <SelectedPagePanel
      slug={slug}
      kpi={screen.kpi}
      compare={screen.compare}
      granularity={screen.granularity}
      timezone={screen.timezone}
      selected={selected}
    />
  );
}
