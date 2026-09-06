import type { EventsScreen } from "@/lib/screens/events";
import { SelectedEventPanel } from "./selected";
import { EventsTable } from "./table";

export async function TableSection({
  screen,
  hasFilters,
}: {
  screen: EventsScreen;
  hasFilters: boolean;
}) {
  const table = await screen.table;
  return (
    <EventsTable
      compare={screen.compare}
      hasFilters={hasFilters}
      table={table}
    />
  );
}

export async function SelectedSection({ screen }: { screen: EventsScreen }) {
  const selected = await screen.selected;
  return (
    <SelectedEventPanel
      compare={screen.compare}
      granularity={screen.granularity}
      timezone={screen.timezone}
      selected={selected}
    />
  );
}
