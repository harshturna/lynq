import type { GoalsScreen } from "@/lib/screens/goals";
import { SelectedGoalPanel } from "./selected";
import { GoalsTable } from "./table";

export async function GoalsSection({
  screen,
  slug,
  isGuest,
}: {
  screen: GoalsScreen;
  slug: string;
  isGuest: boolean;
}) {
  const goals = await screen.goals;
  return (
    <GoalsTable
      slug={slug}
      isGuest={isGuest}
      kpi={screen.kpi}
      compare={screen.compare}
      goals={goals}
    />
  );
}

export async function SelectedSection({ screen }: { screen: GoalsScreen }) {
  const selected = await screen.selected;
  return (
    <SelectedGoalPanel
      compare={screen.compare}
      granularity={screen.granularity}
      timezone={screen.timezone}
      selected={selected}
    />
  );
}
