import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SitesNav } from "@/components/shell/sites-nav";
import { getWebsite } from "@/lib/actions";
import { getUser } from "@/lib/user/server";
import { Onboarding } from "./_new/onboarding";

/** Onboarding (design §8.11): install, wait for the first event, pick a KPI. */
export default async function NewSitePage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const user = await getUser();
  if (!user?.id) redirect("/login");
  const isGuest = user.id === process.env.GUEST_USER_ID;
  // The slug cannot be turned back into a hostname (dots and hyphens both
  // become hyphens), so the site named in the URL is looked up here.
  const { site } = await searchParams;
  const siteUrl = site
    ? ((await getWebsite(site, user.id)).data?.url ?? null)
    : null;
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <SitesNav userEmail={user.email ?? ""} />
      <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 py-8 md:px-8">
        <Suspense>
          <Onboarding userId={user.id} isGuest={isGuest} siteUrl={siteUrl} />
        </Suspense>
      </main>
    </div>
  );
}
