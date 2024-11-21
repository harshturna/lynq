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
