import type { BotsScreen } from "@/lib/screens/bots";
import { BotsLead, BotsTables } from "./view";

export async function LeadSection({ screen }: { screen: BotsScreen }) {
  const lead = await screen.lead;
  return <BotsLead data={lead} rangeLabel={screen.rangeLabel} />;
}

export async function PagesSection({ screen }: { screen: BotsScreen }) {
  const [lead, pages] = await Promise.all([screen.lead, screen.pages]);
  return <BotsTables lead={lead} pages={pages} />;
}
