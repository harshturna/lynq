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
  await supabase.from("visitors").insert({ client_id: clientId, website_url });
}

export async function addPageView(
  website_url: string,
  page: string,
  session_id: string,
  pathname: string,
  referrer: string | null,
  userAgentData: {
    browser: Browser;
    os: Os;
  }
) {
  const supabase = await createClient();

  const device =
    userAgentData.os === "Ios" || userAgentData.os === "Android"
      ? "Mobile"
      : "Desktop";

  const { error } = await supabase.from("page_views").insert({
    website_url,
    page,
    device,
    session_id,
    pathname,
    referrer,
    browser: userAgentData.browser,
    operating_system: userAgentData.os,
  });
  console.log("ERROR", error);
}

export async function addSession(session_id: string, website_url: string) {
  const supabase = await createClient();
  await supabase.from("sessions").insert({ website_url, session_id });
}

export async function addSessionDuration(
  website_url: string,
  session_id: string,
  session_duration: number
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select("session_duration")
    .eq("website_url", website_url)
    .eq("session_id", session_id)
    .single();
  const updatedDuration = (data?.session_duration || 0) + session_duration;

  await supabase
    .from("sessions")
    .update({ session_duration: updatedDuration })
    .eq("website_url", website_url)
    .eq("session_id", session_id);
}

export async function getAllTimeVisitors() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("visitors")
    .select("*", { count: "exact", head: true });

  return count;
}
