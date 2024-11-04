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
