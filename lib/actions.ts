"use server";

import { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { getUser } from "./user/server";

export async function addWebsite(name: string, url: string, user_id: string) {
  // check if the user making the request is the resource owner
  const user = await getUser();
  if (!user || !user.id) return "Unauthorized User";
  if (user_id !== user.id) return "Unauthorized User";

  const slug = url.replaceAll(".", "-");
  const supabase = await createClient();
  const response = await supabase
    .from("websites")
    .insert({ name, url, user_id: user_id, slug });

  return response;
}

export async function getAllWebsites(userId: string): Promise<{
  data: Website[] | null;
  error: PostgrestError | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("user_id", userId);

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
    .single();

  return { data, error };
}

export async function updateWebsiteOne(
  website_slug: string,
  column: string,
  value: string,
  user_id: string
) {
  const supabase = await createClient();

  // check if the user making the request is the resource owner
  const user = await getUser();
  if (!user || !user.id) return "Unauthorized User";
  if (user_id !== user.id) return new Error("Unauthorized user");

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
  if (user_id !== user.id) return new Error("Unauthorized user");

  const { error } = await supabase
    .from("websites")
    .delete()
    .eq("slug", website_slug)
    .eq("user_id", user_id);

  return error;
}

// Analytics

export async function addVisitor(clientId: string, website_url: string) {
  const supabase = await createClient();
  supabase.from("visitors").insert({ client_id: clientId, website_url });
}

export async function addPageView(
  website_url: string,
  page: string,
  session_id: string,
  userAgentData: {
    browser: Browser;
    os: Os;
  }
) {
  const supabase = await createClient();

  const device = userAgentData.os === "Ios" || "Android" ? "Mobile" : "Desktop";

  const { data, error } = await supabase.from("page_views").insert({
    website_url,
    page,
    device,
    session_id,
    browser: userAgentData.browser,
    operating_system: userAgentData.os,
  });

  console.log("ERROR", error);
}
