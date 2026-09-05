import type { OverviewScreen } from "@/lib/screens/overview";
import { Lead } from "./lead";
import { Tables } from "./tables";
import { VitalsStrip } from "./vitals";

/**
 * Server children (design §10): each awaits its already-settled sections
 * inside its own Suspense boundary and hands plain data to a client
 * component. Promises never cross into client components.
 */
export async function LeadSection({
  screen,
  slug,
  siteUrl,
  hasFilters,
}: {
  screen: OverviewScreen;
  slug: string;
  siteUrl: string;
  hasFilters: boolean;
}) {
  const [summary, series, goal, devices] = await Promise.all([
    screen.summary,
    screen.series,
    screen.goal,
    screen.devices,
  ]);
  return (
    <Lead
      slug={slug}
      siteUrl={siteUrl}
      hasFilters={hasFilters}
      kpi={screen.kpi}
      metric={screen.metric}
      granularity={screen.granularity}
      timezone={screen.timezone}
      compare={screen.compare}
      summary={summary}
      series={series}
      goal={goal}
      devices={devices}
    />
  );
}

export async function TablesSection({
  screen,
  hasFilters,
}: {
  screen: OverviewScreen;
  hasFilters: boolean;
}) {
  const [pages, sources, locations] = await Promise.all([
    screen.pages,
    screen.sources,
    screen.locations,
  ]);
  return (
    <Tables
      kpi={screen.kpi}
      compare={screen.compare}
      hasFilters={hasFilters}
      pages={pages}
      sources={sources}
      locations={locations}
    />
  );
}

export async function VitalsSection({
  screen,
  slug,
}: {
  screen: OverviewScreen;
  slug: string;
}) {
  const vitals = await screen.vitals;
  return <VitalsStrip slug={slug} vitals={vitals} />;
}
