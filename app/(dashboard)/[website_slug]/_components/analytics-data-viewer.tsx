import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Asterisk,
  LayoutPanelTop,
  MapPin,
  MonitorSmartphone,
} from "lucide-react";

const tabs = [
  {
    name: "Page",
    icon: LayoutPanelTop,
  },
  {
    name: "Location",
    icon: MapPin,
  },
  {
    name: "Devices",
    icon: MonitorSmartphone,
  },
  {
    name: "Referees",
    icon: Asterisk,
  },
];

const AnalyticsDataViewer = () => {
  return (
    <Card className="w-[800px] rounded-2xl overflow-hidden border-2">
      <CardContent className="px-0">
        <Tabs>
          <TabsList className="bg-stone-900 rounded-xl h-[40px] w-full justify-evenly rounded-b-none">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.name}
                value={tab.name}
                className="py-1 rounded-sm text-sm"
              >
                <div className="flex items-center justify-center gap-2">
                  {<tab.icon width={15} height={15} />}
                  {tab.name}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="Page"></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AnalyticsDataViewer;
