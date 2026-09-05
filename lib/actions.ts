"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { sql } from "./db";
import { createClient } from "./supabase/server";
import { getUser } from "./user/server";

export async function addWebsite(name: string, url: string, user_id: string) {
  // check if the user making the request is the resource owner
  const user = await getUser();
  if (!user || !user.id) return "Unauthorized User";
  if (user_id !== user.id) return "Unauthorized User";

  if (user_id === process.env.GUEST_USER_ID)
    return "Guest user cannot perform this action";

  const slug = url.replaceAll(".", "-");
  const supabase = await createClient();
  const response = await supabase
    .from("websites")
    .insert({ name, url, user_id: user_id, slug })
    .select("id")
    .single();
  if (response.error) return response;

  // Ingest resolves a batch's origin through analytics.site_hostnames, so a
  // site with no hostname row never receives an event (found by the
  // onboarding e2e, TICKET-047). Settings › General manages the list later.
  try {
    await sql`insert into analytics.site_hostnames (site_id, hostname)
      values (${Number(response.data.id)}, analytics.normalise_hostname(${url}))`;
  } catch {
    // The hostname belongs to another site: undo the row so the slug is free again.
    await supabase.from("websites").delete().eq("id", response.data.id);
    return "This hostname is already tracked by another site";
  }
  return response;
}

export async function getAllWebsites(userId: string): Promise<{
  data: Website[] | null;
  error: PostgrestError | null | string;
}> {
  const [supabase, user] = await Promise.all([createClient(), getUser()]);
  if (!user?.id || userId !== user.id) {
    return { data: null, error: "Unauthorized User" };
  }

  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null);

  return { data, error };
}

export async function getWebsite(
  website_slug: string,
  user_id: string
): Promise<{
  data: Website | null;
  error: PostgrestError | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("slug", website_slug)
    .eq("user_id", user_id)
    .is("deleted_at", null)
    .single();

  return { data, error };
}

// The only columns a user may change through this action. The URL is the
// analytics identity (analytics.site_hostnames) and is not editable here.
const UPDATABLE_WEBSITE_COLUMNS = ["name"] as const;
type UpdatableWebsiteColumn = (typeof UPDATABLE_WEBSITE_COLUMNS)[number];

export async function updateWebsiteOne(
  website_slug: string,
  column: UpdatableWebsiteColumn,
  value: string,
  user_id: string
) {
  if (!UPDATABLE_WEBSITE_COLUMNS.includes(column)) {
    return "Column cannot be updated";
  }
  const supabase = await createClient();

  // check if the user making the request is the resource owner
  const user = await getUser();
  if (!user || !user.id) return "Unauthorized User";
  if (user_id !== user.id) return "Unauthorized user";

  if (user_id === process.env.GUEST_USER_ID)
    return "Guest user cannot perform this action";

  const { error } = await supabase
    .from("websites")
    .update({ [column]: value })
    .eq("slug", website_slug)
    .eq("user_id", user_id);

  return error;
}

export async function deleteWebsite(website_slug: string, user_id: string) {
  const supabase = await createClient();

  // check if the user making the request is the resource owner
  const user = await getUser();
  if (!user || !user.id) return "Unauthorized User";
  if (user_id !== user.id) return "Unauthorized user";

  if (user_id === process.env.GUEST_USER_ID)
    return "Guest user cannot perform this action";

  // Soft delete: analytics.housekeeping() removes the site's events in
  // batches overnight and then the row, so a request never runs the cascade.
  const { error } = await supabase
    .from("websites")
    .update({ deleted_at: new Date().toISOString() })
    .eq("slug", website_slug)
    .eq("user_id", user_id);

  return error;
}
