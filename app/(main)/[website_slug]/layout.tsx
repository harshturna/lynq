import { Suspense } from "react";
import { TopNav } from "@/components/shell/top-nav";
import { ShellProvider } from "@/components/shell/view-state";
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
  const { website, sites, userEmail } = await resolveSite(website_slug);
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <Suspense>
        <ShellProvider>
          <TopNav
            site={{ slug: website.slug, name: website.name, url: website.url }}
            sites={sites}
            userEmail={userEmail}
          />
          {children}
        </ShellProvider>
      </Suspense>
    </div>
  );
}
