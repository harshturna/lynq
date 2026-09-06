import "server-only";
import { type Family, isFamily, PAGE_FAMILIES } from "@/lib/crawler-families";
import type { BuiltContext } from "@/lib/query/authorize";
import type {
  CrawlerPageRow,
  CrawlerRow,
  FamilyRow,
  OrientationRow,
} from "@/lib/query/crawlers";
import {
  crawlerFamilies,
  crawlerOrientation,
  crawlerPages,
  crawlers,
} from "@/lib/query/run";
import type { ViewState } from "@/lib/url-state";
import { periodPhrase } from "./period";
import { type Section, settle } from "./settle";

/**
 * The Bots screen (docs/design/bot-traffic.md §6, D-018): hits by family as
 * the headline, crawlers and pages ranked, and the orientation files. The
 * Pages table can be narrowed to one family through the `bots` view region.
 */
export const BOTS_TABLE_LIMIT = 200;

export type BotsLeadData = {
  families: FamilyRow[];
  crawlers: CrawlerRow[];
  orientation: OrientationRow[];
};

export type BotsPagesData = {
  family: Family | null;
  rows: CrawlerPageRow[];
  total: number;
};

export type BotsScreen = {
  rangeLabel: string;
  family: Family | null;
  lead: Promise<Section<BotsLeadData>>;
  pages: Promise<Section<BotsPagesData>>;
};

export function pageFamily(state: ViewState): Family | null {
  const v = state.view.bots;
  return isFamily(v) && PAGE_FAMILIES.includes(v) ? v : null;
}

export function getBotsScreen(ctx: BuiltContext, state: ViewState): BotsScreen {
  const family = pageFamily(state);
  const crawlersP = crawlers(ctx, { limit: BOTS_TABLE_LIMIT });
  const lead = async (): Promise<BotsLeadData> => {
    const [families, top, orientation] = await Promise.all([
      crawlerFamilies(ctx),
      crawlersP,
      crawlerOrientation(ctx),
    ]);
    return { families, crawlers: top, orientation };
  };
  const pages = async (): Promise<BotsPagesData> => {
    const rows = await crawlerPages(ctx, { family, limit: BOTS_TABLE_LIMIT });
    return { family, rows, total: rows[0]?.total ?? 0 };
  };
  return {
    rangeLabel: periodPhrase(state.range),
    family,
    lead: settle("bots.lead", lead()),
    pages: settle("bots.pages", pages()),
  };
}
