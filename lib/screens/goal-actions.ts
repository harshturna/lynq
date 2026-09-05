"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getUser } from "@/lib/user/server";
import { resolveSite } from "./site";

/**
 * Goal writes (design §8.8, §11): every action resolves the site through the
 * owner's session, rejects the guest with one sentence, and returns either
 * an error string or the affected id. Goals are read through postgres.js;
 * the KPI is site_settings.kpi_goal_id, upserted because most sites have no
 * settings row yet.
 */
export type GoalInput = {
  name: string;
  kind: "pageview" | "event";
  match: string;
  revenue: boolean;
  target: number | null;
  kpi: boolean;
};

export type GoalResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

const GUEST = "The guest account cannot change goals.";

function validate(input: GoalInput): string | null {
  const name = input.name.trim();
  const match = input.match.trim();
  if (!name || name.length > 80)
    return "Give the goal a name of up to 80 characters.";
  if (!match || match.length > 512)
    return "Say what completes it: a path glob or an event name.";
  if (input.kind === "pageview" && !match.startsWith("/"))
    return "A page goal's path starts with /.";
  if (input.kind === "event" && /[\s/]/.test(match))
    return "An event name has no spaces or slashes.";
  if (
    input.target !== null &&
    (!Number.isInteger(input.target) || input.target <= 0)
  )
    return "The target is a whole number of completions per month.";
  return null;
}

type Owner =
  | { ok: false; error: string }
  | { ok: true; site: Awaited<ReturnType<typeof resolveSite>>["site"] };

async function owner(slug: string): Promise<Owner> {
  const user = await getUser();
  if (!user?.id) return { ok: false, error: "Your session has expired." };
  if (user.id === process.env.GUEST_USER_ID) return { ok: false, error: GUEST };
  const { site } = await resolveSite(slug);
  return { ok: true, site };
}

export async function createGoal(
  slug: string,
  input: GoalInput
): Promise<GoalResult> {
  const o = await owner(slug);
  if (!o.ok) return { ok: false, error: o.error };
  const bad = validate(input);
  if (bad) return { ok: false, error: bad };
  const [row] = await sql<{ id: number }[]>`
    insert into public.goals (site_id, name, kind, match, revenue, target)
    values (${o.site.siteId}, ${input.name.trim()}, ${input.kind}, ${input.match.trim()}, ${input.revenue}, ${input.target})
    returning id`;
  const id = Number(row.id);
  if (input.kpi) await setKpiFor(o.site.siteId, id);
  revalidatePath(`/${slug}`, "layout");
  return { ok: true, id };
}

export async function updateGoal(
  slug: string,
  id: number,
  input: GoalInput
): Promise<GoalResult> {
  const o = await owner(slug);
  if (!o.ok) return { ok: false, error: o.error };
  const bad = validate(input);
  if (bad) return { ok: false, error: bad };
  const [row] = await sql<{ id: number }[]>`
    update public.goals set name = ${input.name.trim()}, kind = ${input.kind}, match = ${input.match.trim()},
      revenue = ${input.revenue}, target = ${input.target}
    where id = ${id} and site_id = ${o.site.siteId} returning id`;
  if (!row) return { ok: false, error: "That goal no longer exists." };
  if (input.kpi) await setKpiFor(o.site.siteId, id);
  else if (o.site.kpiGoalId === id) await setKpiFor(o.site.siteId, null);
  revalidatePath(`/${slug}`, "layout");
  return { ok: true, id };
}

export async function deleteGoal(
  slug: string,
  id: number
): Promise<GoalResult> {
  const o = await owner(slug);
  if (!o.ok) return { ok: false, error: o.error };
  const [row] = await sql<{ id: number }[]>`
    delete from public.goals where id = ${id} and site_id = ${o.site.siteId} returning id`;
  if (!row) return { ok: false, error: "That goal no longer exists." };
  revalidatePath(`/${slug}`, "layout");
  return { ok: true, id };
}

/** Marks a goal as the KPI, or clears it with null. */
export async function setKpi(
  slug: string,
  id: number | null
): Promise<GoalResult> {
  const o = await owner(slug);
  if (!o.ok) return { ok: false, error: o.error };
  if (id !== null) {
    const [row] = await sql<{ id: number }[]>`
      select id from public.goals where id = ${id} and site_id = ${o.site.siteId}`;
    if (!row) return { ok: false, error: "That goal no longer exists." };
  }
  await setKpiFor(o.site.siteId, id);
  revalidatePath(`/${slug}`, "layout");
  return { ok: true, id: id ?? 0 };
}

async function setKpiFor(siteId: number, id: number | null) {
  await sql`
    insert into analytics.site_settings (site_id, kpi_goal_id) values (${siteId}, ${id})
    on conflict (site_id) do update set kpi_goal_id = excluded.kpi_goal_id`;
}
