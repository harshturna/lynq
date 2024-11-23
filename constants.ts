import { AppWindowMac, KeyRound, Settings } from "lucide-react";

export const sidePanelItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: AppWindowMac,
  },
  {
    title: "Api Keys",
    href: "/settings/api",
    icon: KeyRound,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export const datePickerValues: DatePickerValues[] = [
  "Today",
  "Last 7 days",
  "Last 30 days",
  "Last 3 months",
  "Last 12 months",
];

export const TODAY_FACTOR = 24 * 60 * 60 * 1000;

export const EXCLUDED_KEYS = [
  "id",
  "created_at",
  "session_id",
  "website_url",
] as const;

export const coreVitalDetails = {
  cls: {
    type: "CLS",
    name: "Cumulative Layout Shift",
    link: "https://web.dev/articles/cls/",
    description:
      "CLS measures the sum total of all individual layout shift scores for every unexpected layout shift that occurs during the entire lifespan of the page. The score is zero to any positive number, where zero means no shifting and the larger the number, the more layout shift on the page. This is important because having pages elements shift while a user is trying to interact with it is a bad user experience. If you can't seem to find the reason for a high value, try interacting with the page to see how that affects the score.",
  },
  lcp: {
    type: "LCP",
    name: "Largest Contentful Paint",
    link: "https://web.dev/articles/lcp",
    description:
      "The amount of time to render the largest content element visible in the viewport, from when the user requests the URL. The largest element is typically an image or video, or perhaps a large block-level text element. This metric is important because it indicates how quickly a visitor sees that the URL is actually loading.",
  },
  inp: {
    type: "INP",
    name: "Interaction to Next Paint",
    link: "https://web.dev/articles/inp/",
    description:
      "A metric that assesses a page's overall responsiveness to user interactions by observing the time that it takes for the page to respond to all click, tap, and keyboard interactions that occur throughout the lifespan of a user's visit to a page. The final INP value is the longest interaction observed, ignoring outliers.",
  },
};
