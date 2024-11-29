import DescriptionList from "@/components/ui/description-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";

interface EventDataProps {
  event: GroupedCustomEventWithSessionData;
}

const EventData = ({ event }: EventDataProps) => {
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
            <DescriptionList term="Browser" detail={event.sessions.browser} />
            <DescriptionList term="Country" detail={event.sessions.country} />
            <DescriptionList term="City" detail={event.sessions.city} />
            <DescriptionList
              term="OS"
              detail={event.sessions.operating_system}
            />
            <DescriptionList term="Device" detail={event.sessions.device} />
            <DescriptionList
              term="Occurred"
              detail={formatDistanceToNow(event.created_at, {
                addSuffix: true,
              })}
            />
            <DescriptionList term="Path Name" detail={event.page_url} />
          </div>
        </TabsContent>
        <TabsContent value="custom">
          {event.properties.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 items-center justify-center gap-8 mt-8 mb-4 px-4">
              {event.properties.map((prop) => (
                <DescriptionList
                  key={prop.property_name}
                  term={prop.property_name}
                  detail={prop.property_value}
                />
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
