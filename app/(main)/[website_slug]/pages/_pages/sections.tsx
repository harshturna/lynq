import type { PagesScreen } from "@/lib/screens/pages";
import { AttentionView } from "./attention-view";
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
  if (screen.attention)
    return (
      <AttentionView
        data={await screen.attention}
        rangeLabel={screen.rangeLabel}
      />
    );
  if (!screen.table) return null;
  const table = await screen.table;
  return (
    <PagesTable
      slug={slug}
      view={screen.view}
      kpi={screen.kpi}
      compare={screen.compare}
      hasFilters={hasFilters}
      granularity={screen.granularity}
      timezone={screen.timezone}
      table={table}
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
