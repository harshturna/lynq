import type { SourcesScreen } from "@/lib/screens/sources";
import { SourcesQuadrant } from "./quadrant";
import { SourcesStrip } from "./strip";
import { SourcesTables } from "./tables";

export async function StripSection({ screen }: { screen: SourcesScreen }) {
  const strip = await screen.strip;
  return <SourcesStrip strip={strip} compare={screen.compare} />;
}

export async function QuadrantSection({ screen }: { screen: SourcesScreen }) {
  const quadrant = await screen.quadrant;
  return <SourcesQuadrant quadrant={quadrant} kpi={screen.kpi} />;
}

export async function TablesSection({
  screen,
  hasFilters,
}: {
  screen: SourcesScreen;
  hasFilters: boolean;
}) {
  const [channels, sources, campaigns] = await Promise.all([
    screen.channels,
    screen.sources,
    screen.campaigns,
  ]);
  return (
    <SourcesTables
      kpi={screen.kpi}
      compare={screen.compare}
      hasFilters={hasFilters}
      channels={channels}
      sources={sources}
      campaigns={campaigns}
    />
  );
}
