import { redirect } from "next/navigation";
import ErrorAlert from "@/components/error";
import { getWebsite, updateWebsiteOne } from "@/lib/actions";
import { getDashboard } from "@/lib/dashboard";
import { getUser } from "@/lib/user/server";
import WebsiteDashboard from "./_components/website-dashboard";

interface WebsitePageProps {
  params: Promise<{
    website_slug: string;
  }>;
}

const WebsitePage = async (props: WebsitePageProps) => {
  const [params, user] = await Promise.all([props.params, getUser()]);
  if (!params.website_slug || !user || !user.id) {
    redirect("/dashboard");
  }

  const { data: website, error } = await getWebsite(
    params.website_slug,
    user.id
  );

  if (!website || error) {
    return (
      <ErrorAlert
        title="Failed to get the website data"
        description="Ran into an error while getting the data, try refreshing the page"
      />
    );
  }

  const { data: initialData, error: dashboardError } = await getDashboard(
    website.url,
    "Last 30 days"
  );

  if (!initialData || dashboardError) {
    return (
      <ErrorAlert
        title="Failed to get analytics"
        description="Ran into an error while getting the data, try refreshing the page"
      />
    );
  }

  // Setting the is_first_visit flag to false after visiting the dashboard for
  // the first time. Skipped for the guest user, whose writes are always
  // rejected — awaiting it just added a blocking round-trip to every load.
  const isGuest = user.id === process.env.GUEST_USER_ID;
  if (website.is_first_visit && !isGuest) {
    await updateWebsiteOne(
      params.website_slug,
      "is_first_visit",
      "false",
      user.id
    );
  }

  return (
    <WebsiteDashboard
      isFirstVisit={website.is_first_visit}
      websiteName={website.name}
      websiteUrl={website.url}
      initialData={initialData}
    />
  );
};

export default WebsitePage;
