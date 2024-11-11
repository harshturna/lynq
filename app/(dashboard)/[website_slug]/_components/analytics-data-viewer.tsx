import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Asterisk,
  LayoutPanelTop,
  MapPin,
  MonitorSmartphone,
} from "lucide-react";
import AnalyticsDataList from "./analytics-data-list";
import DevicesDataViewer from "./devices-data-viewer";

interface AnalyticsDataViewer {
  analyticsDataWithCount: AnalyticsDataWithCounts;
}

const tabs = [
  {
    name: "Pages",
    icon: LayoutPanelTop,
  },
  {
    name: "Locations",
    icon: MapPin,
  },
  {
    name: "Devices",
    icon: MonitorSmartphone,
  },
  {
    name: "Referrers",
    icon: Asterisk,
  },
];

const AnalyticsDataViewer = ({
  analyticsDataWithCount,
}: AnalyticsDataViewer) => {
  return (
    <Card className="rounded-t-2xl rounded-b-xl overflow-hidden border-2">
      <CardContent className="px-0">
        <Tabs defaultValue={tabs[0].name}>
          <TabsList className="bg-stone-900 rounded-xl h-[40px] w-full justify-evenly rounded-b-none">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.name}
                value={tab.name}
                className="py-1 rounded-sm text-xs md:text-sm px-2 md:px-8"
              >
                <div className="flex items-center justify-center gap-2">
                  {<tab.icon width={15} height={15} />}
                  {tab.name}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent
            value="Pages"
            className="h-[500px] overflow-x-hidden overflow-y-scroll"
          >
            <AnalyticsDataList
              groupBy="pages"
              data={analyticsDataWithCount.analyticsData}
            />
          </TabsContent>
          <TabsContent
            value="Locations"
            className="h-[500px] overflow-x-hidden overflow-y-scroll"
          >
            <AnalyticsDataList
              groupBy="countries"
              data={analyticsDataWithCount.analyticsData}
            />
          </TabsContent>
          <TabsContent value="Devices">
            <DevicesDataViewer
              analyticsData={analyticsDataWithCount.analyticsData}
            />
          </TabsContent>
          <TabsContent
            value="Referrers"
            className="h-[500px] overflow-x-hidden overflow-y-scroll"
          >
            <AnalyticsDataList
              groupBy="referrers"
              data={analyticsDataWithCount.analyticsData}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AnalyticsDataViewer;
