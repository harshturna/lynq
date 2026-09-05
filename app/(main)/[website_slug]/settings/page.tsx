import { PageHeader } from "@/components/shell/page-header";
import { getSettings } from "@/lib/screens/settings";
import { resolveSite } from "@/lib/screens/site";
import { SettingsPage } from "./_settings/settings";

/** Settings (design §8.10): one scrolling page with a sub-nav, saved per section. */
export default async function SettingsRoute(props: {
  params: Promise<{ website_slug: string }>;
}) {
  const { website_slug: slug } = await props.params;
  const { site, website, userId } = await resolveSite(slug);
  const data = await getSettings(site, website);
  const isGuest = userId === process.env.GUEST_USER_ID;
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 md:px-8">
      <PageHeader
        title="Settings"
        subtitle={`${website.url} · changes reach the tracker within a few minutes`}
      />
      <SettingsPage slug={slug} userId={userId} data={data} isGuest={isGuest} />
    </main>
  );
}
