import {
  Activity,
  AlignVerticalDistributeCenter,
  AppWindowMac,
  ChartNoAxesColumnIncreasing,
  KeyRound,
  Send,
  Settings,
  Shield,
  Star,
} from "lucide-react";

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

export const webVitalDetails: WebVitalDetail = {
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
  fcp: {
    type: "FCP",
    name: "First Contentful Paint",
    link: "https://web.dev/articles/fcp",
    description: `First Contentful Paint (FCP) measures the time from when the user first navigated to the page to when any part of the page's content is rendered on the screen. For this metric, "content" refers to text, images (including background images), <svg> elements, or non-white <canvas> elements.`,
  },
  ttfb: {
    type: "TTFB",
    name: "Time to First Byte",
    link: "https://web.dev/articles/ttfb",
    description: `TTFB is a metric that measures the time between the request for a resource and when the first byte of a response begins to arrive.`,
  },
  tbt: {
    type: "TBT",
    name: "Total Blocking Time",
    link: "https://web.dev/articles/tbt",
    description: `The Total Blocking Time (TBT) metric measures the total amount of time after First Contentful Paint (FCP) where the main thread was blocked for long enough to prevent input responsiveness.`,
  },
  tti: {
    type: "TTI",
    name: "Time to Interactive",
    link: "https://web.dev/articles/tti",
    description: `Time to Interactive (TTI) is a lab metric for measuring load responsiveness. It helps identify cases where a page looks interactive but actually isn't. A fast TTI helps ensure that the page is usable.`,
  },
  dcl: {
    type: "DCL",
    name: "DOMContentLoaded Event",
    link: "https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event",
    description: `The DOMContentLoaded event fires when the HTML document has been completely parsed, and all deferred scripts (<script defer src="…"> and <script type="module">) have downloaded and executed. It doesn't wait for other things like images, subframes, and async scripts to finish loading.`,
  },
  load: {
    type: "Load",
    name: "Page Load Time",
    link: "https://sematext.com/glossary/page-load-time/",
    description:
      "Page load time is the amount of time it takes for a web page to fully load. Measured in seconds, it’s one of the indicators of a web page’s performance, and a slow one can hurt user engagement and, consequently, business performance.",
  },
};

export const navLinks = [
  {
    id: "features",
    title: "Features",
  },
];

export const feats = [
  {
    id: "insights",
    title: "Insights",
    value: "Users, locations, devices and more",
  },
  {
    id: "events",
    title: "Events",
    value: "Default and Custom properties",
  },
  {
    id: "performance",
    title: "Performance",
    value: "Web Core Vitals and beyond",
  },
];

export const features = [
  {
    id: "analytics",
    icon: ChartNoAxesColumnIncreasing,
    title: "Analytics That Matter",
    content: "Focus on data that actually helps you grow, without the noise.",
  },
  {
    id: "custom-events",
    icon: AlignVerticalDistributeCenter,
    title: "Custom Events",
    content:
      "Monitor and capture the moments that matter most to your business with fully customizable event tracking.",
  },
  {
    id: "performance-metrics",
    icon: Activity,
    title: "Performance Metrics",
    content:
      "Get a crystal-clear view of all your key performance metrics right in your dashboard.",
  },
];
