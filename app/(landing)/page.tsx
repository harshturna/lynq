import type { Metadata } from "next";
import { getDemoStats } from "@/lib/screens/landing";
import { DemoBand } from "./_landing/band";
import { Closing, LandingFooter } from "./_landing/closing";
import { Hero } from "./_landing/hero";
import { LandingNav } from "./_landing/nav";
import {
  AttentionPanel,
  BotsPanel,
  Eyebrow,
  Feature,
  FiltersPanel,
  Lead,
  OverviewPanel,
  PerformancePanel,
  RealtimePanel,
} from "./_landing/panels";
import { Privacy } from "./_landing/privacy";
import { Reveal } from "./_landing/reveal";
import { Steps } from "./_landing/steps";

export const metadata: Metadata = {
  title: "Lynq · Analytics that respects your visitors",
  description:
    "Web analytics on one page you can read in a minute. No cookies, no banner, one line to install.",
};

/** Re-read the demo site's numbers every minute. */
export const revalidate = 60;

/** The landing page (D-014): light, the product staged in panels, real numbers from the demo site. */
export default async function LandingPage() {
  const demo = await getDemoStats();
  return (
    <div className="min-h-screen overflow-x-clip bg-canvas font-sans text-ink">
      <div className="mx-auto max-w-[1180px] px-8">
        <LandingNav />
      </div>
      <main className="mx-auto max-w-[1180px] px-8">
        <Hero demo={demo} />
        {demo && demo.series.length > 1 && <DemoBand demo={demo} />}

        <Feature
          eyebrow="The Overview"
          lead="The whole picture on one page."
          rest="Traffic, sources, pages and your goal, without clicking around."
        >
          <OverviewPanel />
        </Feature>

        <Feature
          eyebrow="Attention"
          lead="See which pages actually hold people."
          rest="Time held, how far people read, and which pages help them convert. Not just how often a page was opened."
        >
          <AttentionPanel />
        </Feature>

        <Feature
          eyebrow="Bots"
          lead="See which AI assistants read your site."
          rest="ChatGPT, Claude and Perplexity fetch pages to answer people. GPTBot and ClaudeBot collect them for a model. Lynq tells the two apart, page by page, from a few lines on your server."
        >
          <BotsPanel />
        </Feature>

        <Feature
          eyebrow="Filters"
          lead="Drill in with one click."
          rest="Pick a country, a page or a source and every number on the page updates to match."
        >
          <FiltersPanel />
        </Feature>

        <Reveal as="div" className="mt-16 border-t border-rule pt-16">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Eyebrow>Performance</Eyebrow>
              <Lead
                small
                lead="See how fast pages really load."
                rest="Core Web Vitals from real visits, slowest pages first."
              />
              <PerformancePanel />
            </div>
            <div>
              <Eyebrow>Realtime</Eyebrow>
              <Lead
                small
                lead="See who is on the site right now."
                rest="Which pages, from where, as it happens."
              />
              <RealtimePanel />
            </div>
          </div>
        </Reveal>

        <Privacy />
        <Steps />
        <Closing />
      </main>
      <div className="mx-auto max-w-[1180px] px-8">
        <LandingFooter />
      </div>
    </div>
  );
}
