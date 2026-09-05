import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type { SiteSummary } from "@/components/shell/top-nav";
import { getAllWebsites, getWebsite } from "@/lib/actions";
import { authorize, type Site } from "@/lib/query/authorize";
import { getUser } from "@/lib/user/server";

/**
 * The one way a screen gets its site (design §10): the signed-in user, the
 * websites row for the slug, the authorised query site, and the list for
 * the switcher. Cached per request so the layout and the page share it.
 */
export type ResolvedSite = {
  userId: string;
  userEmail: string;
  website: Website;
  site: Site;
  sites: SiteSummary[];
};

export const resolveSite = cache(
  async (slug: string): Promise<ResolvedSite> => {
    const user = await getUser();
    if (!user?.id) redirect("/login");
    const [{ data: website }, { data: all }] = await Promise.all([
      getWebsite(slug, user.id),
      getAllWebsites(user.id),
    ]);
    if (!website) notFound();
    const site = await authorize(
      { kind: "session", userId: user.id },
      { url: website.url }
    );
    if (!site) notFound();
    return {
      userId: user.id,
      userEmail: user.email ?? "",
      website,
      site,
      sites: (all ?? []).map((w) => ({
        slug: w.slug,
        name: w.name,
        url: w.url,
      })),
    };
  }
);
