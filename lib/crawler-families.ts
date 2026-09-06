/**
 * The crawler families (docs/design/bot-traffic.md §5, D-018), client-safe:
 * the Bots screen needs the labels and the isbot list must not ship to the
 * browser, so the map lives in lib/ingest/crawlers.ts and this does not.
 */
export type Family =
  | "answers"
  | "training"
  | "search"
  | "social"
  | "seo"
  | "other";

export const FAMILIES: readonly Family[] = [
  "answers",
  "training",
  "search",
  "social",
  "seo",
  "other",
];

export const FAMILY_LABEL: Record<Family, string> = {
  answers: "Answers",
  training: "Training",
  search: "Search",
  social: "Social",
  seo: "SEO",
  other: "Other",
};

/** What each family is doing, for the legend and the docs. */
export const FAMILY_MEANING: Record<Family, string> = {
  answers: "fetching a page now, to answer someone",
  training: "collecting pages for a model",
  search: "indexing for a search engine",
  social: "unfurling a link in a chat or a feed",
  seo: "a third-party crawler",
  other: "a bot the list does not name",
};

/** The families offered as views on the Bots screen's Pages table; the rest are noise for that question. */
export const PAGE_FAMILIES: readonly Family[] = [
  "answers",
  "training",
  "search",
];

export function isFamily(v: unknown): v is Family {
  return typeof v === "string" && (FAMILIES as string[]).includes(v);
}

/**
 * The three requests that say a crawler is looking for instructions rather
 * than content. Stored under these names so the screen can pick them out.
 */
export const ORIENTATION = ["robots.txt", "llms.txt", "sitemap"] as const;
export type Orientation = (typeof ORIENTATION)[number];

export function isOrientation(path: string): path is Orientation {
  return (ORIENTATION as readonly string[]).includes(path);
}
