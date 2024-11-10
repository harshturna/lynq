type Website = {
  id: number;
  name: string;
  url: string;
  slug: string;
  user_id: string;
  is_first_visit: boolean;
};

type DatePickerValues =
  | "Today"
  | "Yesterday"
  | "This week"
  | "This month"
  | "This year";

type TTrackEvent =
  | "session-start"
  | "page-view"
  | "session-end"
  | "vital"
  | "web-vitals";

type SessionStartEventData = {};

type PageViewEventData = {};

type SessionEndEventData = {
  sessionDuration: number;
};

type VitalEventData =
  | {
      metricName: "Navigation";
      value: NavigationTiming;
      partial: boolean;
    }
  | {
      metricName: "FCP" | "LCP" | "CLS" | "TBT";
      value: number;
      partial: boolean;
    };

interface BaseTrackedEvent {
  timestamp: number;
  url: string;
  dataDomain: string;
  clientId: string;
  userAgentData: {
    userAgent: string;
    language: string;
    platform: string;
    screenResolution: string;
    viewportSize: string;
    timeZone: string;
  };
}

type TTrackedEvent =
  | (BaseTrackedEvent & {
      event: "session-start";
      eventData: SessionStartEventData;
    })
  | (BaseTrackedEvent & {
      event: "page-view";
      eventData: PageViewEventData;
    })
  | (BaseTrackedEvent & {
      event: "session-end";
      eventData: SessionEndEventData;
    })
  | (BaseTrackedEvent & {
      event: "vital";
      eventData: VitalEventData;
    })
  | (BaseTrackedEvent & {
      event: "web-vitals";
      eventData: WebVitalsEventData;
    });
