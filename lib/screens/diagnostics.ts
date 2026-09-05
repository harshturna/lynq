/**
 * Ingest rejections in plain words (design §8.11), shared by Settings ›
 * Tracking and onboarding's "we are listening" step.
 */
export type Diagnostic = {
  stage: string;
  count: number;
  lastAt: string;
  detail: string;
  /** hostname the rejected traffic came from */
  hostname: string;
};

const STAGE_TEXT: Record<string, (d: Diagnostic) => string> = {
  site_mismatch: (d) =>
    `We received events from ${d.hostname}, which is not one of this site's hostnames.`,
  unregistered: (d) =>
    `We received events for ${d.hostname}, which no site claims.`,
  origin_missing: () =>
    "The request had no Origin header; is the snippet inside a sandboxed iframe?",
  bot: () => "Traffic arrived but all of it was classified as bots.",
  excluded_path: (d) =>
    `The page path ${d.detail || "(unknown)"} is on your excluded list.`,
  excluded_ip: () => "Traffic arrived from an excluded IP range.",
  schema: (d) =>
    `Events were malformed${d.detail ? ` (${d.detail})` : ""}; is the snippet the current version?`,
  size: () => "A batch was larger than the ingest limit.",
  insert_failed: () =>
    "Events arrived but could not be stored; this is on our side.",
};

export function explainDiagnostic(d: Diagnostic): string {
  const f = STAGE_TEXT[d.stage];
  return f
    ? f(d)
    : `Rejected at "${d.stage}"${d.detail ? `: ${d.detail}` : ""}.`;
}
