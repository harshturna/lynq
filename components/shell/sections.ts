/** The nine sections of a site, in nav order (design §4). */
export const SECTIONS = [
  { key: "", label: "Overview" },
  { key: "realtime", label: "Realtime" },
  { key: "pages", label: "Pages" },
  { key: "sources", label: "Sources" },
  { key: "locations", label: "Locations" },
  { key: "devices", label: "Devices" },
  { key: "events", label: "Events" },
  { key: "goals", label: "Goals" },
  { key: "performance", label: "Performance" },
] as const;

export type SiteSummary = { slug: string; name: string; url: string };
