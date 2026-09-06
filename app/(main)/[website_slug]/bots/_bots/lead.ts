import type { Segment } from "@/components/shell/views";
import { FAMILIES, FAMILY_LABEL, type Family } from "@/lib/crawler-families";
import type { BotsLeadData } from "@/lib/screens/bots";

/**
 * The Bots lead: the pool of crawler hits, split by family, then one
 * sentence that answers the question the split raises, answering someone
 * against training a model. Pure, so the sentence is tested.
 */
export type BotsLead = {
  total: number;
  segments: Segment[];
  sentence: Sentence;
};

export type Sentence = {
  /** The opening clause about answers against training. */
  opening: string;
  /** The top crawler, or null when there is none. */
  top: { crawler: string; hits: number } | null;
  /** How many crawlers read llms.txt, or 0. */
  llms: number;
};

const n = (v: number) => v.toLocaleString("en-US");

export function botsLead(d: BotsLeadData): BotsLead | null {
  const byFamily = new Map<Family, number>(
    d.families.map((f) => [f.family, f.hits])
  );
  const total = d.families.reduce((a, f) => a + f.hits, 0);
  if (!total) return null;
  const segments: Segment[] = FAMILIES.filter((f) => byFamily.get(f)).map(
    (f) => ({ key: f, label: FAMILY_LABEL[f], value: byFamily.get(f) ?? 0 })
  );
  const answers = byFamily.get("answers") ?? 0;
  const training = byFamily.get("training") ?? 0;
  let opening: string;
  if (answers && answers >= training) {
    opening = training
      ? `Answer engines fetched pages ${n(answers)} times to answer someone, more than the ${n(training)} that training crawlers took for a model.`
      : `Answer engines fetched pages ${n(answers)} times to answer someone; no training crawler came.`;
  } else if (training) {
    opening = answers
      ? `Training crawlers took pages ${n(training)} times for a model; answer engines fetched ${n(answers)} to answer someone.`
      : `Training crawlers took pages ${n(training)} times for a model; no answer engine came.`;
  } else {
    const lead = segments[0];
    opening = `No AI crawler yet. ${lead.label} crawlers made ${n(lead.value)} of the ${n(total)} hits.`;
  }
  const first = d.crawlers[0];
  const llms = d.orientation.find((o) => o.path === "llms.txt")?.crawlers ?? 0;
  return {
    total,
    segments,
    sentence: {
      opening,
      top: first ? { crawler: first.crawler, hits: first.hits } : null,
      llms,
    },
  };
}
