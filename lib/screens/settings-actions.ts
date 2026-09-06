"use server";

import { revalidatePath } from "next/cache";
import { updateWebsiteOne } from "@/lib/actions";
import { generateToken, hashToken, isScope, type Scope } from "@/lib/api-keys";
import { sql } from "@/lib/db";
import { getUser } from "@/lib/user/server";
import { resolveSite } from "./site";

/**
 * Settings writes (design §8.10): one action per section, each an upsert on
 * analytics.site_settings because most sites have no row yet. The owner is
 * resolved through the session and the guest is refused with one sentence.
 */
export type SaveResult = { ok: true } | { ok: false; error: string };

const GUEST = "The guest account cannot change settings.";

type Owner =
  | { ok: false; error: string }
  | { ok: true; userId: string; siteId: number };

async function owner(slug: string): Promise<Owner> {
  const user = await getUser();
  if (!user?.id) return { ok: false, error: "Your session has expired." };
  if (user.id === process.env.GUEST_USER_ID) return { ok: false, error: GUEST };
  const { site } = await resolveSite(slug);
  return { ok: true, userId: user.id, siteId: site.siteId };
}

const TZ = /^[A-Za-z_]+(?:\/[A-Za-z_+-]+){0,2}$/;

export async function saveGeneral(
  slug: string,
  input: {
    name: string;
    timezone: string;
    shortcuts: boolean;
    hostnames: string[];
  }
): Promise<SaveResult> {
  const o = await owner(slug);
  if (!o.ok) return o;
  const name = input.name.trim();
  if (!name || name.length > 80)
    return { ok: false, error: "Give the site a name of up to 80 characters." };
  if (!TZ.test(input.timezone))
    return { ok: false, error: "That is not an IANA timezone name." };
  try {
    Intl.DateTimeFormat(undefined, { timeZone: input.timezone });
  } catch {
    return { ok: false, error: "That is not a timezone this server knows." };
  }
  const hosts = [
    ...new Set(
      input.hostnames.map((h) => h.trim().toLowerCase()).filter(Boolean)
    ),
  ];
  if (!hosts.length) return { ok: false, error: "Keep at least one hostname." };
  if (hosts.some((h) => h.includes("/") || h.includes(" ") || !h.includes(".")))
    return {
      ok: false,
      error: "Hostnames are bare domains, e.g. www.example.com.",
    };
  const renamed = await updateWebsiteOne(slug, "name", name, o.userId);
  if (typeof renamed === "string") return { ok: false, error: renamed };
  if (renamed) return { ok: false, error: "Couldn't rename the site." };
  await sql.begin(async (tx) => {
    await tx`
      insert into analytics.site_settings (site_id, timezone, shortcuts) values (${o.siteId}, ${input.timezone}, ${input.shortcuts})
      on conflict (site_id) do update set timezone = excluded.timezone, shortcuts = excluded.shortcuts`;
    await tx`delete from analytics.site_hostnames where site_id = ${o.siteId} and hostname <> all(${hosts}::text[])`;
    for (const h of hosts)
      await tx`insert into analytics.site_hostnames (site_id, hostname) values (${o.siteId}, ${h}) on conflict do nothing`;
  });
  revalidatePath(`/${slug}`, "layout");
  return { ok: true };
}

export async function saveTracking(
  slug: string,
  input: { storeTitles: boolean; storeUserIds: boolean }
): Promise<SaveResult> {
  const o = await owner(slug);
  if (!o.ok) return o;
  await sql`
    insert into analytics.site_settings (site_id, store_titles, store_user_ids)
    values (${o.siteId}, ${input.storeTitles}, ${input.storeUserIds})
    on conflict (site_id) do update set store_titles = excluded.store_titles, store_user_ids = excluded.store_user_ids`;
  revalidatePath(`/${slug}/settings`);
  return { ok: true };
}

export async function saveExclusions(
  slug: string,
  input: { ips: string[]; paths: string[] }
): Promise<SaveResult> {
  const o = await owner(slug);
  if (!o.ok) return o;
  const ips = input.ips.map((s) => s.trim()).filter(Boolean);
  const paths = input.paths.map((s) => s.trim()).filter(Boolean);
  if (ips.length > 200 || paths.length > 200)
    return { ok: false, error: "Keep each list under 200 entries." };
  if (paths.some((p) => !p.startsWith("/")))
    return { ok: false, error: "Path globs start with /, e.g. /preview/*." };
  try {
    await sql`
      insert into analytics.site_settings (site_id, excluded_ips, excluded_paths)
      values (${o.siteId}, ${ips}::cidr[], ${paths}::text[])
      on conflict (site_id) do update set excluded_ips = excluded.excluded_ips, excluded_paths = excluded.excluded_paths`;
  } catch (err) {
    const m = err instanceof Error ? err.message : "";
    return {
      ok: false,
      error: m.includes("cidr")
        ? "One of the IPs is not a valid address or CIDR range, e.g. 203.0.113.0/24."
        : "Couldn't save the exclusions.",
    };
  }
  revalidatePath(`/${slug}/settings`);
  return { ok: true };
}

export async function saveData(
  slug: string,
  input: { retentionMonths: number; breakpoints: number[] }
): Promise<SaveResult> {
  const o = await owner(slug);
  if (!o.ok) return o;
  const r = input.retentionMonths;
  if (!Number.isInteger(r) || r < 1 || r > 120)
    return {
      ok: false,
      error: "Retention is a whole number of months from 1 to 120.",
    };
  const bps = [...new Set(input.breakpoints)].sort((a, b) => a - b);
  if (
    bps.length < 1 ||
    bps.length > 6 ||
    bps.some((b) => !Number.isInteger(b) || b < 200 || b > 4000)
  )
    return {
      ok: false,
      error:
        "One to six breakpoints, each a whole number of pixels from 200 to 4000.",
    };
  await sql`
    insert into analytics.site_settings (site_id, retention_months, breakpoints)
    values (${o.siteId}, ${r}, ${bps}::smallint[])
    on conflict (site_id) do update set retention_months = excluded.retention_months, breakpoints = excluded.breakpoints`;
  revalidatePath(`/${slug}`, "layout");
  return { ok: true };
}

/**
 * API keys (D-017). The token is returned once, here, and never again: only
 * its hash is stored, so a lost key is replaced rather than recovered.
 */
export async function createApiKey(
  slug: string,
  input: { name: string; scopes: string[] }
): Promise<SaveResult & { token?: string }> {
  const o = await owner(slug);
  if (!o.ok) return o;
  const name = input.name.trim();
  if (!name || name.length > 60)
    return { ok: false, error: "Give the key a name of up to 60 characters." };
  const scopes = input.scopes.filter(isScope) as Scope[];
  if (!scopes.length)
    return { ok: false, error: "Choose at least one thing the key may do." };
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from analytics.api_keys
    where site_id = ${o.siteId} and revoked_at is null`;
  if (n >= 20)
    return {
      ok: false,
      error: "This site already has 20 keys; revoke one first.",
    };
  const { token, prefix } = generateToken();
  await sql`
    insert into analytics.api_keys (site_id, name, scopes, token_hash, prefix)
    values (${o.siteId}, ${name}, ${scopes}, ${hashToken(token)}, ${prefix})`;
  revalidatePath(`/${slug}/settings`);
  return { ok: true, token };
}

export async function revokeApiKey(
  slug: string,
  id: number
): Promise<SaveResult> {
  const o = await owner(slug);
  if (!o.ok) return o;
  // scoped to the site, so one site's key cannot be revoked from another
  const rows = await sql`
    update analytics.api_keys set revoked_at = now()
    where id = ${id} and site_id = ${o.siteId} and revoked_at is null
    returning id`;
  if (!rows.length) return { ok: false, error: "That key is already gone." };
  revalidatePath(`/${slug}/settings`);
  return { ok: true };
}
