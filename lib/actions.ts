"use server";

import { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { getUser } from "./user/server";
import {
  calculateAverageSessionDuration,
  calculateBounceRate,
  getTimeFrame,
} from "./utils";

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
  if (user_id !== user.id) return "Unauthorized user";

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

  const { data: websiteVisitors, error: websiteError } = await supabase
    .from("websites")
    .select("visitors")
    .eq("url", website_url)
    .single();

  if (websiteError) return;

  const { error } = await supabase
    .from("visitors")
    .insert({ client_id: clientId, website_url });

  if (!error) {
    await supabase
      .from("websites")
      .update({
        visitors:
          typeof websiteVisitors.visitors === "number"
            ? websiteVisitors.visitors + 1
            : 1,
      })
      .eq("url", website_url);
  }

  // client already added
  if (error && error.code === "23505") {
    const currentDateTime = new Date().toISOString();
    await supabase
      .from("visitors")
      .update({ last_visited: currentDateTime })
      .eq("client_id", clientId);
  }
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
      : userAgentData.os === "Unknown"
      ? "Unknown"
      : "Desktop";

  const { data: countryObj } = await supabase
    .from("sessions")
    .select("country")
    .eq("session_id", session_id)
    .single();

  let country = "Unknown";
  if (countryObj && countryObj.country) {
    country = countryObj.country;
  }

  const { data, error } = await supabase.from("page_views").insert({
    website_url,
    page,
    device,
    session_id,
    pathname,
    referrer,
    browser: userAgentData.browser,
    operating_system: userAgentData.os,
    country,
  });

  console.log("error", error);
}

export async function addSession(
  session_id: string,
  client_id: string,
  country: string,
  website_url: string
) {
  const supabase = await createClient();
  await supabase
    .from("sessions")
    .insert({ website_url, session_id, client_id, country });
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

export async function getAllTimeVisitors(website_url: string, user_id: string) {
  // check if the user making the request is the resource owner
  const user = await getUser();
  if (!user || !user.id) return "Unauthorized User";
  if (user_id !== user.id) return "Unauthorized User";

  const supabase = await createClient();
  const { count } = await supabase
    .from("visitors")
    .select("*", { count: "exact", head: true })
    .eq("website_url", website_url);

  return count;
}

export async function getAnalytics(
  pickedTimeFrame: DatePickerValues,
  website_url: string,
  user_id: string
): Promise<{
  res: AnalyticsDataWithCounts | null;
  error: PostgrestError | null | string;
}> {
  try {
    const [supabase, user] = await Promise.all([createClient(), getUser()]);

    if (!user?.id) {
      return { res: null, error: "Unauthorized User" };
    }
    if (user_id !== user.id) {
      return { res: null, error: "Unauthorized User" };
    }

    const timeFrame = getTimeFrame(pickedTimeFrame);
    const currentDateTime = new Date().toISOString();

    const [analyticsResponse, visitorsResult, viewsResult, sessionsResult] =
      await Promise.all([
        // Analytics data query
        supabase
          .from("page_views")
          .select("*")
          .eq("website_url", website_url)
          .gte("created_at", timeFrame)
          .lte("created_at", currentDateTime),

        // Visitors count query
        supabase
          .from("visitors")
          .select("*", { count: "exact", head: true })
          .eq("website_url", website_url)
          .gte("last_visited", timeFrame)
          .lte("last_visited", currentDateTime),

        // Views count query
        supabase
          .from("page_views")
          .select("*", { count: "exact", head: true })
          .eq("website_url", website_url)
          .gte("created_at", timeFrame)
          .lte("created_at", currentDateTime),

        // Sessions query
        supabase
          .from("sessions")
          .select("session_duration")
          .eq("website_url", website_url)
          .gte("created_at", timeFrame)
          .lte("created_at", currentDateTime),
      ]);

    // Check for errors in any of the queries
    if (analyticsResponse.error) throw analyticsResponse.error;
    // if (visitorsResult.error) throw visitorsResult.error;
    // if (viewsResult.error) throw viewsResult.error;
    // if (sessionsResult.error) throw sessionsResult.error;

    // Calculate metrics
    const visitors_count = visitorsResult.count ?? 0;
    const views_count = viewsResult.count ?? 0;
    const average_session_duration = sessionsResult.data
      ? calculateAverageSessionDuration(sessionsResult.data)
      : 0;
    const bounce_rate = sessionsResult.data
      ? calculateBounceRate(sessionsResult.data)
      : 0;

    // Prepare and return response
    return {
      res: {
        analyticsData: analyticsResponse.data ?? [],
        views_count,
        visitors_count,
        average_session_duration,
        bounce_rate,
      },
      error: null,
    };
  } catch (error) {
    return {
      res: null,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
