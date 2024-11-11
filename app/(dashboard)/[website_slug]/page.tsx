import { getAnalytics, getWebsite, updateWebsiteOne } from "@/lib/actions";
import { redirect } from "next/navigation";
import SetupDialog from "./_components/setup-dialog";
import { getUser } from "@/lib/user/server";
import WebsiteDashboard from "./_components/website-dashboard";

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

  if (!website || error || website.user_id !== user.id) {
    redirect("/dashboard");
  }

  const { res: analyticsData, error: analyticsError } = await getAnalytics(
    "Today",
    website.url,
    user.id
  );

  // TODO: Update this as we don't want to do this
  if (!analyticsData || error) {
    return <SetupDialog title="Add script to start tracking" />;
  }

  // set the is_first_visit flag to false after visiting the dashboard for the first time
  if (website.is_first_visit) {
    updateWebsiteOne(params.website_slug, "is_first_visit", "false", user.id);
  }

  return (
    <>
      {website.is_first_visit && <SetupDialog title="Add script" />}
      <WebsiteDashboard
        userId={user.id}
        websiteName={website.name}
        websiteUrl={website.url}
        initialAnalyticsData={analyticsData}
      />
    </>
  );
};

export default WebsitePage;
