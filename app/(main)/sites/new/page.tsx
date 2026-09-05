import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SitesNav } from "@/components/shell/sites-nav";
import { getUser } from "@/lib/user/server";
import { Onboarding } from "./_new/onboarding";

/** Onboarding (design §8.11): install, wait for the first event, pick a KPI. */
export default async function NewSitePage() {
  const user = await getUser();
  if (!user?.id) redirect("/login");
  const isGuest = user.id === process.env.GUEST_USER_ID;
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <SitesNav userEmail={user.email ?? ""} />
      <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 py-8 md:px-8">
        <Suspense>
          <Onboarding userId={user.id} isGuest={isGuest} />
        </Suspense>
      </main>
    </div>
  );
}
