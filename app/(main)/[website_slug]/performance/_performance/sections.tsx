import type { PerformanceScreen } from "@/lib/screens/performance";
import { LcpByDevice } from "./chart";
import { LcpDistribution } from "./distribution";
import { VitalsPages } from "./pages";
import { SlowPanel } from "./selected";
import { VitalsStrip } from "./strip";

export async function StripSection({ screen }: { screen: PerformanceScreen }) {
  const strip = await screen.strip;
  return <VitalsStrip strip={strip} compare={screen.compare} />;
}

export async function ChartSection({ screen }: { screen: PerformanceScreen }) {
  const byDevice = await screen.byDevice;
  return (
    <LcpByDevice
      byDevice={byDevice}
      granularity={screen.granularity}
      timezone={screen.timezone}
    />
  );
}

export async function PagesSection({
  screen,
  hasFilters,
}: {
  screen: PerformanceScreen;
  hasFilters: boolean;
}) {
  const pages = await screen.pages;
  return <VitalsPages pages={pages} hasFilters={hasFilters} />;
}

export async function SelectedSection({
  screen,
}: {
  screen: PerformanceScreen;
}) {
  const selected = await screen.selected;
  return <SlowPanel selected={selected} />;
}

export async function DistributionSection({
  screen,
}: {
  screen: PerformanceScreen;
}) {
  const distribution = await screen.distribution;
  return <LcpDistribution distribution={distribution} />;
}
