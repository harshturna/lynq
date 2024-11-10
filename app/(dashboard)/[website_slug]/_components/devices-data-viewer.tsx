import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalyticsDataList from "./analytics-data-list";

interface DevicesDataViewer {
  analyticsData: AnalyticsData[];
}

const tabs = ["Devices", "Browsers", "OS"];

const DevicesDataViewer = ({ analyticsData }: DevicesDataViewer) => {
  return (
    <Tabs defaultValue={tabs[0]}>
      <div className="flex justify-center mt-5">
        <TabsList className="bg-stone-900 rounded-[4px] h-[44px]">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="data-[state=active]:text-sky-500 py-2 rounded-[4px] text-sm"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value="Devices">
        <AnalyticsDataList groupBy="devices" data={analyticsData} />
      </TabsContent>
      <TabsContent value="Browsers">
        <AnalyticsDataList groupBy="browsers" data={analyticsData} />
      </TabsContent>
      <TabsContent value="OS">
        <AnalyticsDataList groupBy="operating_systems" data={analyticsData} />
      </TabsContent>
    </Tabs>
  );
};

export default DevicesDataViewer;
