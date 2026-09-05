type Website = {
  id: number;
  name: string;
  url: string;
  slug: string;
  user_id: string;
  deleted_at: string | null;
};

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
