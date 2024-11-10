"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";

const tabs: { name: string; tab: string }[] = [
  {
    name: "Analytics",
    tab: "analytics",
  },
  {
    name: "Events",
    tab: "events",
  },
  {
    name: "Performance",
    tab: "performance",
  },
];

const NavTabs = () => {
  const router = useRouter();

  return (
    <Tabs
      defaultValue={tabs[0].tab}
      className="w-[max-content]"
      onValueChange={(val) => {
        router.push(`?tab=${val}`);
      }}
    >
      <TabsList className="bg-stone-900 rounded-[4px] h-[44px]">
        {tabs.map((tab) => (
          <TabsTrigger
            value={tab.tab}
            key={tab.tab}
            className="data-[state=active]:text-sky-500 py-2 rounded-[4px] text-sm"
          >
            {tab.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default NavTabs;