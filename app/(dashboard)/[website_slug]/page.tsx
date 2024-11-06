import { getWebsite, updateWebsiteOne } from "@/lib/actions";
import { redirect } from "next/navigation";
import SetupDialog from "./_components/setup-dialog";
import { getUser } from "@/lib/user/server";

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

  const { data: website, error } = await getWebsite(params.website_slug);

  if (!website || error || website.user_id !== user.id) {
    redirect("/dashboard");
  }

  // set the is_first_visit flag to false after visiting the dashboard for the first time
  // TODO: Uncomment after development
  // if (website.is_first_visit) {
  //   updateWebsiteOne(params.website_slug, "is_first_visit", "false");
  // }

  return (
    <>
      {website.is_first_visit && <SetupDialog />}
      <div>WebsitePage</div>
    </>
  );
};

export default WebsitePage;
