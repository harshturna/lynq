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

type SessionStartEventData = Record<never, never>;

type PageViewEventData = Record<never, never>;

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

type Browser = "Edge" | "Chrome" | "Opera" | "Firefox" | "Safari" | "Unknown";
type Os = "Windows" | "Mac" | "Ios" | "Android" | "Linux";

interface BaseTrackedEvent {
  timestamp: number;
  url: string;
  dataDomain: string;
  clientId: string;
  sessionId: string;
  userAgentData: {
    browser: Browser;
    os: Os;
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
