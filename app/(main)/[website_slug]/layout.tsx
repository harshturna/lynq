import { Suspense } from "react";
import { SessionDrawer } from "@/components/shell/session-drawer";
import { TopNav } from "@/components/shell/top-nav";
import { ShellProvider } from "@/components/shell/view-state";
import { sessionTimeline } from "@/lib/screens/session";
import { resolveSite } from "@/lib/screens/site";

/** The site shell (design §4, §6): top navigation on the light base, URL state below. */
export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ website_slug: string }>;
}) {
  const { website_slug } = await params;
  const { website, site, sites, userEmail } = await resolveSite(website_slug);
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <Suspense>
        <ShellProvider>
          <TopNav
            site={{ slug: website.slug, name: website.name, url: website.url }}
            sites={sites}
            userEmail={userEmail}
            shortcuts={site.shortcuts}
            bots={site.bots}
          />
          {children}
          <SessionDrawer load={sessionTimeline.bind(null, website.slug)} />
        </ShellProvider>
      </Suspense>
    </div>
  );
}
