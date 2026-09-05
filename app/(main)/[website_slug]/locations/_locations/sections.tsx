import type { LocationsScreen } from "@/lib/screens/locations";
import { LocationsHeatmap } from "./heatmap";
import { LocationsTables } from "./tables";

export async function TablesSection({
  screen,
  hasFilters,
}: {
  screen: LocationsScreen;
  hasFilters: boolean;
}) {
  const [countries, regions, cities, languages] = await Promise.all([
    screen.countries,
    screen.regions,
    screen.cities,
    screen.languages,
  ]);
  return (
    <LocationsTables
      kpi={screen.kpi}
      compare={screen.compare}
      hasFilters={hasFilters}
      country={screen.country}
      countries={countries}
      regions={regions}
      cities={cities}
      languages={languages}
    />
  );
}

export async function HeatmapSection({ screen }: { screen: LocationsScreen }) {
  const heat = await screen.heatmap;
  return <LocationsHeatmap heat={heat} />;
}
