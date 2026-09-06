/**
 * When a lead view is not rendered (design §12): too little data or too
 * little width. The fallback is one sentence naming the threshold; the
 * screen's table stays where it is.
 */
export const MIN_QUADRANT_SOURCES = 3;
export const MIN_HEATMAP_SESSIONS = 30;
export const MIN_HISTOGRAM_SAMPLES = 50;
export const MIN_FUNNEL_SESSIONS = 10;
export const HEATMAP_MIN_WIDTH = 700;
/** Below this width the heatmap buckets to 3-hour columns. */
export const HEATMAP_BUCKET_BELOW = 640;

export type Threshold = { ok: boolean; reason?: string };

export function quadrantThreshold(sources: number): Threshold {
  return sources < MIN_QUADRANT_SOURCES
    ? {
        ok: false,
        reason: `The quadrant appears once ${MIN_QUADRANT_SOURCES} or more sources have visitors.`,
      }
    : { ok: true };
}

export function heatmapThreshold(
  sessions: number,
  width: number | null
): Threshold {
  if (sessions < MIN_HEATMAP_SESSIONS)
    return {
      ok: false,
      reason: `The heatmap appears once ${MIN_HEATMAP_SESSIONS} or more sessions are in the range.`,
    };
  if (width !== null && width < HEATMAP_MIN_WIDTH)
    return {
      ok: false,
      reason:
        "The heatmap needs a wider screen; the table has the same numbers.",
    };
  return { ok: true };
}

export function histogramThreshold(samples: number): Threshold {
  return samples < MIN_HISTOGRAM_SAMPLES
    ? {
        ok: false,
        reason: `The distribution appears once ${MIN_HISTOGRAM_SAMPLES} or more samples are in the range.`,
      }
    : { ok: true };
}

export function funnelThreshold(firstStep: number): Threshold {
  return firstStep < MIN_FUNNEL_SESSIONS
    ? {
        ok: false,
        reason: `The funnel appears once ${MIN_FUNNEL_SESSIONS} or more sessions reach its first step.`,
      }
    : { ok: true };
}
