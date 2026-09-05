import { ScreenHeader } from "@/components/shell/screen-header";
import { getLive, liveWindow } from "@/lib/screens/live";
import { resolveSite } from "@/lib/screens/site";
import { suggestValues } from "@/lib/screens/suggest";
import type { SearchInput } from "@/lib/url-state";
import { Live } from "./_realtime/live";
import { WindowSegment } from "./_realtime/window-segment";

/** Realtime (design §8.2): the first result renders on the server; the client polls from there. */
export default async function RealtimePage(props: {
  params: Promise<{ website_slug: string }>;
  searchParams: Promise<SearchInput>;
}) {
  const [{ website_slug: slug }, sp] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const { site } = await resolveSite(slug);
  const now = new Date();
  const windowMin = liveWindow(sp);
  const initial = await getLive(site, sp, now).catch(() => null);
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 md:px-8">
      <ScreenHeader
        title="Realtime"
        timezone={site.timezone}
        shortcuts={site.shortcuts}
        suggest={suggestValues.bind(null, slug)}
        pickers={false}
        subtitle={`last ${windowMin === 60 ? "hour" : "30 minutes"} · ${site.timezone}`}
        controls={<WindowSegment />}
      />
      <Live
        slug={slug}
        windowMin={windowMin}
        initial={initial}
        initialAt={now.toISOString()}
      />
    </main>
  );
}
