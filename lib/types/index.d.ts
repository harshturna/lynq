type Website = {
  id: number;
  name: string;
  url: string;
  slug: string;
  user_id: string;
  is_first_visit: boolean;
  visitors: number;
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

type WebVitalsResponseData = {
  id: number;
  lcp: number;
  cls: number;
  inp: number;
  fcp: number;
  ttfb: number;
  tbt: number;
  load: number;
  tti: number;
  dcl: number;
  interaction_count: number;
  resource_count: number;
  total_js_heap: number;
  used_js_heap: number;
};

type WebVitalsMetrics = Omit<WebVitalsResponseData, "id">;

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

type AnalyticsData = {
  id: number;
  created_at: string;
  website_url: string;
  page: string;
  session_id: string;
  pathname: string;
  referrer: "Direct" | "Unknown" | string;
};

type AnalyticsDataWithSessionData = {
  id: number;
  created_at: string;
  website_url: string;
  page: string;
  session_id: string;
  pathname: string;
  referrer: "Direct" | "Unknown" | string;
  country: string;
  device: Device;
  operating_system: Os;
  browser: Browser;
  city: string;
};

type SessionData = {
  id: number;
  created_at: string;
  website_url: string;
  session_id: string;
  country: string;
  device: Device;
  operating_system: Os;
  browser: Browser;
  city: string;
};

type FetchedCustomEventData = {
  id: number;
  event_id: string;
  created_at: string;
  event_name: string;
  property_name: string | null;
  property_value: string | null;
  website_url: string;
  session_id: string;
  page_url: string;
};

type CustomEventWithSessionData = FetchedCustomEventData & {
  sessions: SessionData;
};

type GroupedCustomEventWithSessionData = Omit<
  CustomEventWithSessionData,
  "property_name" | "property_value"
> & {
  properties: {
    property_name: string;
    property_value: string;
  }[];
};

type GroupedCustomEventWithSessionDataAccumulatorType = {
  [key: string]: GroupedCustomEventWithSessionData;
};

type AnalyticsDataWithCounts = {
  analyticsData: AnalyticsDataWithSessionData[] | [];
  sessionData: SessionData[] | [];
  views_count: number;
  visitors_count: number;
  average_session_duration: number;
  bounce_rate: number;
};

type AnalyticsGroupBy =
  | "pages"
  | "devices"
  | "operating_systems"
  | "countries"
  | "browsers"
  | "referrers";

interface ChartDataPoint {
  date: string;
  [views | sessions]: number;
}

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
