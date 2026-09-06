/**
 * Demo notes (TICKET-076): the two launch spikes the traffic generator draws
 * (scripts/seed/generate.ts, at 38% and 72% of the range) get the sentences
 * that explain them, plus a deploy the week before the second one.
 */
const DAY_MS = 86_400_000;

export type SeedNote = {
  site_id: number;
  at: Date;
  text: string;
  author: string;
};

export function seedNotes(opts: {
  siteId: number;
  days: number;
  until?: Date;
}): SeedNote[] {
  const until = opts.until ?? new Date();
  const start =
    Math.floor(until.getTime() / DAY_MS) * DAY_MS - opts.days * DAY_MS;
  const at = (day: number, hour: number) =>
    new Date(start + day * DAY_MS + hour * 3_600_000);
  const first = Math.floor(opts.days * 0.38);
  const second = Math.floor(opts.days * 0.72);
  return [
    {
      site_id: opts.siteId,
      at: at(first, 14),
      text: "Launched on Product Hunt",
      author: "seed",
    },
    {
      site_id: opts.siteId,
      at: at(second - 6, 10),
      text: "Deployed v2.0",
      author: "key:Deploy pipeline",
    },
    {
      site_id: opts.siteId,
      at: at(second, 9),
      text: "Launch week: annual plan and the new pricing page",
      author: "seed",
    },
  ].filter((n) => n.at < until && n.at.getTime() >= start);
}
