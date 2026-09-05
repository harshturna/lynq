import "server-only";
import { getGeoCodesFromHeaders } from "@/lib/geo/request-geo";
import { insertEvents } from "./db-deps";
import { parseUserAgent } from "./enrich";
import { normaliseHostname } from "./hostnames";
import { resolveSite } from "./sites";
import { createV1Memory, mapV1Event } from "./v1-adapter";

const memory = createV1Memory();

/**
 * Dual-write for the v1 route (design §7.9): after the old tables are
 * written, the same event lands in analytics.events with ingest_version = 1.
 * Never throws; a failure here must not affect the v1 response.
 */
export async function adaptAndInsertV1(
  body: TTrackedEvent,
  headers: { get(name: string): string | null },
  receivedAt: Date
): Promise<number> {
  try {
    const hostname = normaliseHostname(body.dataDomain);
    if (!hostname) return 0;
    const site = await resolveSite(hostname);
    if (!site) return 0;
    const rows = mapV1Event(body, {
      site,
      ua: parseUserAgent(headers.get("user-agent")),
      geo: getGeoCodesFromHeaders(headers),
      receivedAt,
      identitySecret: process.env.LYNQ_IDENTITY_SECRET ?? "",
      memory,
    });
    if (rows.length) await insertEvents(rows);
    return rows.length;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        lynq: "v1_adapter_failed",
        error: message.slice(0, 500),
      })
    );
    return 0;
  }
}
