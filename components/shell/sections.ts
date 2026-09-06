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

/** Shown only once a site has reported a crawler hit (D-018), so nobody carries an empty tab. */
export const BOTS_SECTION = { key: "bots", label: "Bots" } as const;

export type Section = (typeof SECTIONS)[number] | typeof BOTS_SECTION;

export function sectionsFor(bots: boolean): readonly Section[] {
  return bots ? [...SECTIONS, BOTS_SECTION] : SECTIONS;
}

export type SiteSummary = { slug: string; name: string; url: string };
