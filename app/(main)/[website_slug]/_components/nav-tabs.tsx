"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const navTab = useSearchParams().get("tab");

  return (
    <Tabs
      value={navTab || tabs[0].tab}
      className="w-[max-content]"
      onValueChange={(val) => {
        // Shallow URL update via the native History API. router.push would
        // trigger a full RSC round-trip and re-run every analytics query,
        // even though all three tabs' data already lives in client state.
        window.history.pushState(null, "", `?tab=${val}`);
      }}
    >
      <TabsList className="bg-stone-900 rounded-[4px] h-[44px]">
        {tabs.map((tab) => (
          <TabsTrigger
            value={tab.tab}
            key={tab.tab}
            className="py-2 rounded-[4px] text-sm"
          >
            {tab.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default NavTabs;
