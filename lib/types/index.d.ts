type Website = {
  id: number;
  name: string;
  url: string;
  slug: string;
  user_id: string;
  is_first_visit: boolean;
  visitors: number;
  deleted_at: string | null;
};

type DatePickerValues =
  | "Today"
  | "Last 7 days"
  | "Last 30 days"
  | "Last 3 months"
  | "Last 12 months";

type TTrackEvent = "session-start" | "page-view" | "session-end" | "web-vitals";

type SessionStartEventData = Record<never, never>;

type PageViewEventData = Record<never, never>;

type SessionEndEventData = {
  sessionDuration: number;
  metrics: WebVitalsEventData;
};

type WebVitalsEventData = {
  lcp: number;
  cls: number;
  inp: number;
  fcp: number;
  ttfb: number;
  tbt: number;
  dcl: number;
  load: number;
  tti: number;
  interactionCount: number;
  resourceCount: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
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

type CustomEventData = {
  name: string;
  eventId: string;
  properties: object | null | undefined;
};

type Browser = "Edge" | "Chrome" | "Opera" | "Firefox" | "Safari" | "Unknown";
type Os = "Windows" | "Mac" | "Ios" | "Android" | "Linux" | "Unknown";
type Device = "Desktop" | "Mobile" | "Unknown";

interface BaseTrackedEvent {
  timestamp: number;
  url: string;
  pathname: string;
  referrer: string | null;
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
      event: "custom-event";
      eventData: CustomEventData;
    })
  | (BaseTrackedEvent & {
      event: "initial-custom-event";
      eventData: CustomEventData;
    });

type WebVitalType =
  | "lcp"
  | "cls"
  | "inp"
  | "fcp"
  | "ttfb"
  | "tbt"
  | "load"
  | "tti"
  | "dcl";

type WebVitalScore = {
  score: string;
  range: "Good" | "Need improvement" | "Poor" | "Not enough data";
  type: WebVitalType;
};

type WebVitalDetail = {
  [key in WebVitalType]: {
    type: string;
    name: string;
    link: string;
    description: string;
  };
};
