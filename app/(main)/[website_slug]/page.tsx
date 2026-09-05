import { redirect } from "next/navigation";
import ErrorAlert from "@/components/error";
import { getWebsite } from "@/lib/actions";
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

  return (
    <WebsiteDashboard
      websiteName={website.name}
      websiteUrl={website.url}
      initialData={initialData}
    />
  );
};

export default WebsitePage;
