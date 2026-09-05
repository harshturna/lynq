type Website = {
  id: number;
  name: string;
  url: string;
  slug: string;
  user_id: string;
  is_first_visit: boolean;
  deleted_at: string | null;
};

type DatePickerValues =
  | "Today"
  | "Last 7 days"
  | "Last 30 days"
  | "Last 3 months"
  | "Last 12 months";

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
