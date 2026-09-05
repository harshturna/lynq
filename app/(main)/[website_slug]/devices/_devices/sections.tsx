import type { DevicesScreen } from "@/lib/screens/devices";
import { DevicesHistogram } from "./histogram";
import { DevicesMatrix } from "./matrix";
import { DevicesSplit } from "./split";
import { DevicesTables } from "./tables";

export async function SplitSection({ screen }: { screen: DevicesScreen }) {
  const split = await screen.split;
  return <DevicesSplit split={split} compare={screen.compare} />;
}

export async function TablesSection({
  screen,
  hasFilters,
}: {
  screen: DevicesScreen;
  hasFilters: boolean;
}) {
  const [browsers, systems] = await Promise.all([
    screen.browsers,
    screen.systems,
  ]);
  return (
    <DevicesTables
      compare={screen.compare}
      hasFilters={hasFilters}
      browsers={browsers}
      systems={systems}
    />
  );
}

export async function HistogramSection({ screen }: { screen: DevicesScreen }) {
  const histogram = await screen.histogram;
  return <DevicesHistogram histogram={histogram} />;
}

export async function MatrixSection({ screen }: { screen: DevicesScreen }) {
  const matrix = await screen.matrix;
  return <DevicesMatrix matrix={matrix} />;
}
