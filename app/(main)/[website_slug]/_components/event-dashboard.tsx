"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import EventData from "./event-data";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { ChangeEvent, useState } from "react";

interface EventDashboardProps {
  events: GroupedCustomEventWithSessionData[];
}

const EventDashboard = ({ events }: EventDashboardProps) => {
  const [inputValue, setInputValue] = useState("");

  const filteredEvents = events.filter((event) =>
    inputValue === ""
      ? true
      : event.event_name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="mb-8 min-h-[80vh]">
      <div className="flex flex-col md:flex-row justify-between gap-2">
        <div>
          <Input
            placeholder="Filter by event name..."
            className="min-w-[300px]"
            value={inputValue}
            onChange={(e) => handleFilterChange(e)}
          />
        </div>
        <div className="mb-6 text-sm font-bold text-right">{`${filteredEvents.length} events found`}</div>
      </div>
      <Accordion type="multiple">
        <AccordionItem value="header" disabled>
          <AccordionTrigger data-header>
            <div className="grid grid-cols-[50%_30%_20%] w-full ml-4 text-muted-foreground uppercase text-xs">
              <span>Event</span>
              <span>Country</span>
              <span>Occurred</span>
            </div>
          </AccordionTrigger>
        </AccordionItem>
      </Accordion>
      <Accordion type="multiple" className="max-h-[400px] overflow-y-auto">
        {!filteredEvents.length ? (
          <p className="text-center my-8 text-muted-foreground text-sm">
            No events found for this period
          </p>
        ) : null}
        {filteredEvents.map((event) => (
          <AccordionItem value={`${event.id}`} key={event.id}>
            <AccordionTrigger>
              <div className="grid grid-cols-[50%_30%_20%] w-full ml-4 text-sm">
                <span>{event.event_name}</span>
                <span>{event.sessions.country}</span>
                <span>
                  {formatDistanceToNow(event.created_at, { addSuffix: true })}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <EventData event={event} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default EventDashboard;
