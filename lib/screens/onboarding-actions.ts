"use server";

import { sql } from "@/lib/db";
import type { Diagnostic } from "./diagnostics";
import { readDiagnostics } from "./settings";
import { resolveSite } from "./site";

/** Why nothing was accepted (design §8.11): the site's rejections over the last 15 minutes. */
const DIAGNOSE_MINUTES = 15;

export async function diagnose(slug: string): Promise<Diagnostic[]> {
  const { site } = await resolveSite(slug);
  const hosts = (
    await sql<{ hostname: string }[]>`
      select hostname from analytics.site_hostnames where site_id = ${site.siteId}`
  ).map((h) => h.hostname);
  return readDiagnostics(site.siteId, hosts, DIAGNOSE_MINUTES);
}
