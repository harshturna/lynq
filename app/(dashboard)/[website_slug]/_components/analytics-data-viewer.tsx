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
  analyticsData: AnalyticsData[];
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

const AnalyticsDataViewer = ({ analyticsData }: AnalyticsDataViewer) => {
  return (
    <Card className="max-w-[800px] rounded-t-2xl rounded-b-xl overflow-hidden border-2">
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
          <TabsContent value="Pages">
            <AnalyticsDataList groupBy="pages" data={analyticsData} />
          </TabsContent>
          <TabsContent value="Locations">
            <AnalyticsDataList groupBy="countries" data={analyticsData} />
          </TabsContent>
          <TabsContent value="Devices">
            <DevicesDataViewer analyticsData={analyticsData} />
          </TabsContent>
          <TabsContent value="Referrers">
            <AnalyticsDataList groupBy="referrers" data={analyticsData} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AnalyticsDataViewer;
