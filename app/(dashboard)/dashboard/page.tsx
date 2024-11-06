import Sidebar from "./_components/sidebar";
import AddWebsite from "./_components/add-website";
import WebsiteCard from "./_components/website-card";
import { getAllWebsites } from "@/lib/actions";
import { getUser } from "@/lib/user/server";
import { redirect } from "next/navigation";
import NoWebsitePrompt from "./_components/no-website-prompt";

const DashboardPage = async () => {
  const user = await getUser();

  if (!user || !user.id) {
    redirect("/login");
  }

  const { data: websites, error } = await getAllWebsites(user.id);

  return (
    <div className="items-center justify-center flex flex-col px-6">
      <div className="w-full flex my-8 gap-16">
        <Sidebar />
        <div className="w-full items-start justify-start flex flex-col">
          <div className="w-full flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-4xl">Websites</h1>
              <p className="text-muted-foreground text-sm md:text-lg">
                Manage your websites
              </p>
            </div>
            <AddWebsite />
          </div>

          <div className="flex flex-wrap w-full gap-10 my-10">
            {!websites || !websites.length ? (
              <NoWebsitePrompt />
            ) : (
              websites.map((website) => (
                <WebsiteCard website={website} key={website.url} />
              ))
            )}
            {/* {websites.map((website) => (
            <Link key={website.id} href={`/w/${website.website_name}`}>
              <div className="border border-white/5 rounded-md py-12 px-6 text-white bg-black w-full cursor-pointer smooth hover:border-whilte/20 hover:bg-[#0505050]">
                <h2>{website.website_name}</h2>
              </div>
            </Link>
          ))} */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
