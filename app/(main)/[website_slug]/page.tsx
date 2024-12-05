import {
  getAnalytics,
  getCustomEventData,
  getVitals,
  getWebsite,
  updateWebsiteOne,
} from "@/lib/actions";
import { redirect } from "next/navigation";
import SetupDialog from "./_components/setup-dialog";
import { getUser } from "@/lib/user/server";
import WebsiteDashboard from "./_components/website-dashboard";
import ErrorAlert from "@/components/error";

interface WebsitePageProps {
  params: {
    website_slug: string;
  };
}

const WebsitePage = async ({ params }: WebsitePageProps) => {
  const user = await getUser();
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

  if (website.user_id !== user.id) {
    redirect("/dashboard");
  }

  const [
    { res: analyticsData, error: analyticsError },
    { data: performanceData, error: performanceError },
    { data: customEventData, error: customEventError },
  ] = await Promise.all([
    getAnalytics("Last 30 days", website.url, user.id),
    getVitals("Last 30 days", website.url, user.id),
    getCustomEventData("Last 30 days", website.url, user.id),
  ]);

  if (!analyticsData || analyticsError) {
    return (
      <ErrorAlert
        title="Failed to get analytics"
        description="Ran into an error while getting the data, try refreshing the page"
      />
    );
  }

  if (!performanceData || performanceError) {
    return (
      <ErrorAlert
        title="Failed to get performance data"
        description="Ran into an error while getting the data, try refreshing the page"
      />
    );
  }

  if (!customEventData || customEventError) {
    return (
      <ErrorAlert
        title="Failed to get custom event data"
        description="Ran into an error while getting the data, try refreshing the page"
      />
    );
  }

  // setting the is_first_visit flag to false after visiting the dashboard for the first time
  if (website.is_first_visit) {
    updateWebsiteOne(params.website_slug, "is_first_visit", "false", user.id);
  }

  return (
    <>
      <WebsiteDashboard
        isFirstVisit={website.is_first_visit}
        userId={user.id}
        websiteName={website.name}
        websiteUrl={website.url}
        initialAnalyticsData={analyticsData}
        initialPerformanceData={performanceData}
        initialCustomEventData={customEventData}
      />
    </>
  );
};

export default WebsitePage;
