import Header from "@/components/header";
import ThemeButton from "@/components/ui/theme-button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

const DashboardPage = () => {
  return (
    <div className="bg-black min-h-screen h-full w-full relative items-center justify-center flex flex-col">
      <Header />

      <div className="w-full items-start justify-start flex flex-col min-h-screen">
        <div className="w-full items-center justify-end flex p-6 border-b border-white z-40">
          <Link href="/add" prefetch>
            <ThemeButton>
              <div className="flex items-center gap-2">
                <PlusIcon width={15} height={15} />
                Add Website
              </div>
            </ThemeButton>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:gird-cols-2 lg:grid-cols-4 w-full gap-10 p-6 z-40">
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
  );
};

export default DashboardPage;
