import { getAnalytics, getWebsite, updateWebsiteOne } from "@/lib/actions";
import { redirect } from "next/navigation";
import SetupDialog from "./_components/setup-dialog";
import { getUser } from "@/lib/user/server";
import NavTabs from "./_components/nav-tabs";
import DatePicker from "./_components/date-picker";
import Loading from "../../../components/loading";
import { groupByAnalytics } from "@/lib/utils";
import AnalyticsDataViewer from "./_components/analytics-data-viewer";

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

  const { data: analyticsData, error: analyticsError } = await getAnalytics(
    "Today",
    website.url,
    user.id
  );

  if (!analyticsData) {
    redirect("/dashboard");
  }

  // set the is_first_visit flag to false after visiting the dashboard for the first time
  // TODO: Uncomment after development
  // if (website.is_first_visit) {
  //   updateWebsiteOne(params.website_slug, "is_first_visit", "false");
  // }

  return (
    <>
      {/* {website.is_first_visit && <SetupDialog />} */}
      <main>
        <div className="flex justify-between items-center">
          <NavTabs />
          <DatePicker />
        </div>

        <div className="my-8">
          <h1 className="text-2xl md:text-4xl">{website.name}</h1>
          <p className="text-muted-foreground">{website.url}</p>
        </div>
        <AnalyticsDataViewer />
      </main>
    </>
  );
};

export default WebsitePage;
