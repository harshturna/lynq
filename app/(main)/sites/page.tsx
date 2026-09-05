import { redirect } from "next/navigation";
import { SitesNav } from "@/components/shell/sites-nav";
import { getSitesScreen } from "@/lib/screens/sites";
import { getUser } from "@/lib/user/server";
import { AddSite } from "./_components/add-site";
import { SitesTable } from "./_components/sites-table";

/** The sites list (design §8.12): one row per site, Add a site as the one accent button. */
export default async function SitesPage(props: {
  searchParams: Promise<{ add?: string | string[] }>;
}) {
  const [user, sp] = await Promise.all([getUser(), props.searchParams]);
  if (!user?.id) redirect("/login");
  const rows = await getSitesScreen(user.id);
  const isGuest = user.id === process.env.GUEST_USER_ID;
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <SitesNav userEmail={user.email ?? ""} />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-6 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-medium leading-[1.1] tracking-[-0.02em]">
              Sites
            </h1>
            <p className="mt-[6px] text-[13px] text-mute">
              {rows.length === 0
                ? "No sites yet"
                : `${rows.length} ${rows.length === 1 ? "site" : "sites"} · visitors are the last 30 days`}
            </p>
          </div>
          <AddSite
            userId={user.id}
            isGuest={isGuest}
            openOnLoad={sp.add !== undefined}
          />
        </div>
        <SitesTable rows={rows} userId={user.id} isGuest={isGuest} />
      </main>
    </div>
  );
}
