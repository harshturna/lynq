import { formatDistanceToNow, parseISO } from "date-fns";
import DescriptionList from "@/components/ui/description-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardEvent } from "@/lib/dashboard-types";
import { displayValue } from "./filter-chips";

interface EventDataProps {
  event: DashboardEvent;
}

const orDash = (value: string) => value || "-";

const EventData = ({ event }: EventDataProps) => {
  const props = Object.entries(event.props);

  return (
    <div className="px-8">
      <Tabs defaultValue="default">
        <TabsList className="flex items-center">
          <TabsTrigger value="default" className="w-full">
            <div>Default Properties</div>
          </TabsTrigger>
          <TabsTrigger value="custom" className="w-full">
            <div>Custom Properties</div>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="default">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 items-center justify-center gap-8 mt-8 mb-4 px-4">
            <DescriptionList term="Browser" detail={orDash(event.browser)} />
            <DescriptionList
              term="Country"
              detail={displayValue("country", event.country)}
            />
            <DescriptionList term="City" detail={orDash(event.city)} />
            <DescriptionList term="OS" detail={orDash(event.os)} />
            <DescriptionList term="Device" detail={orDash(event.device)} />
            <DescriptionList
              term="Occurred"
              detail={formatDistanceToNow(parseISO(event.ts), {
                addSuffix: true,
              })}
            />
            <DescriptionList term="Path Name" detail={orDash(event.path)} />
          </div>
        </TabsContent>
        <TabsContent value="custom">
          {props.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 items-center justify-center gap-8 mt-8 mb-4 px-4">
              {props.map(([name, value]) => (
                <DescriptionList key={name} term={name} detail={value} />
              ))}
            </div>
          ) : (
            <div className="text-center mb-8 mt-12">
              <span>No custom properties found...</span>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EventData;
