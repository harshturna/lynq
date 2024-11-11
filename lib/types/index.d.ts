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

type TTrackEvent =
  | "session-start"
  | "page-view"
  | "session-end"
  | "vital"
  | "web-vitals";

type SessionStartEventData = Record<never, never>;

type PageViewEventData = {
  isInitial: boolean;
};

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
      event: "vital";
      eventData: VitalEventData;
    })
  | (BaseTrackedEvent & {
      event: "web-vitals";
      eventData: WebVitalsEventData;
    });

type AnalyticsData = {
  id: number;
  created_at: string;
  website_url: string;
  page: string;
  country: string | null;
  device: Device;
  operating_system: Os;
  browser: Browser;
  session_id: string;
  pathname: string;
  referrer: "Direct" | "Unknown" | string;
};

type AnalyticsDataWithCounts = {
  analyticsData: AnalyticsData[];
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
