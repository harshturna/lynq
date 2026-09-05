"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { getUser } from "./user/server";
import {
  addSessionDataToAnalytics,
  calculateAverageSessionDuration,
  calculateAverageVital,
  calculateBounceRate,
  getPreviousPeriodBounds,
  getTimeFrame,
  groupEventsByEventId,
} from "./utils";

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
    .insert({ name, url, user_id: user_id, slug });

  return response;
}

/**
 * Gate for every read action that takes a website URL. Server actions are
 * callable from any client with a session, so matching the caller to the
 * passed user id is not enough: the user must also own the website. Ownership
 * is a websites row with this url and user_id, the same rule getWebsite uses.
 */
async function authorizeWebsite(
  website_url: string,
  user_id: string
): Promise<
  | { supabase: Awaited<ReturnType<typeof createClient>>; error: null }
  | { supabase: null; error: string }
> {
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  if (!user?.id || user_id !== user.id) {
    return { supabase: null, error: "Unauthorized User" };
  }

  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("url", website_url)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!website) {
    return { supabase: null, error: "Unauthorized User" };
  }

  return { supabase, error: null };
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

  const { error } = await supabase
    .from("websites")
    .delete()
    .eq("slug", website_slug)
    .eq("user_id", user_id);

  return error;
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
    const { supabase, error: authError } = await authorizeWebsite(
      website_url,
      user_id
    );
    if (!supabase) {
      return { res: null, error: authError };
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
          .lte("created_at", currentDateTime)
          .limit(5000),

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
          .select("*")
          .eq("website_url", website_url)
          .gte("created_at", timeFrame)
          .lte("created_at", currentDateTime)
          .limit(5000),
      ]);

    // Check for errors in any of the queries
    if (analyticsResponse.error) throw analyticsResponse.error;

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
        sessionData: sessionsResult.data ?? [],
        analyticsData: addSessionDataToAnalytics(
          analyticsResponse.data,
          sessionsResult.data || []
        ),
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

/**
 * Summary stats for the period immediately before the selected one, used for
 * the "vs previous period" deltas on the stat cards.
 *
 * Deliberately soft-fails: if the get_period_summary migration hasn't been
 * applied yet, the dashboard should still render, just without deltas.
 */
export async function getPeriodComparison(
  pickedTimeFrame: DatePickerValues,
  website_url: string,
  user_id: string
): Promise<{ data: PeriodSummary | null; error: string | null }> {
  try {
    const { supabase, error: authError } = await authorizeWebsite(
      website_url,
      user_id
    );
    if (!supabase) {
      return { data: null, error: authError };
    }

    const { from, to } = getPreviousPeriodBounds(pickedTimeFrame);

    const { data, error } = await supabase.rpc("get_period_summary", {
      p_website_url: website_url,
      p_from: from,
      p_to: to,
    });

    if (error) return { data: null, error: error.message };

    // The function returns a single row
    const summary = Array.isArray(data) ? data[0] : data;
    if (!summary) return { data: null, error: null };

    return {
      data: {
        views_count: Number(summary.views_count) || 0,
        visitors_count: Number(summary.visitors_count) || 0,
        average_session_duration: Number(summary.average_session_duration) || 0,
        bounce_rate: Number(summary.bounce_rate) || 0,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function getVitals(
  pickedTimeFrame: DatePickerValues,
  website_url: string,
  user_id: string
): Promise<{
  data: (WebVitalsMetrics & { size: number }) | null;
  error: PostgrestError | null | string;
}> {
  const { supabase, error: authError } = await authorizeWebsite(
    website_url,
    user_id
  );
  if (!supabase) {
    return { data: null, error: authError };
  }

  const timeFrame = getTimeFrame(pickedTimeFrame);
  const currentDateTime = new Date().toISOString();

  const { data, error } = await supabase
    .from("vitals")
    .select("*")
    .eq("website_url", website_url)
    .gte("created_at", timeFrame)
    .lte("created_at", currentDateTime);

  if (!data || error) {
    return { data: null, error: error.message };
  }

  return { data: calculateAverageVital(data), error: null };
}

export async function getCustomEventData(
  pickedTimeFrame: DatePickerValues,
  website_url: string,
  user_id: string
): Promise<{
  data: GroupedCustomEventWithSessionData[] | null;
  error: PostgrestError | null | string;
}> {
  const { supabase, error: authError } = await authorizeWebsite(
    website_url,
    user_id
  );
  if (!supabase) {
    return { data: null, error: authError };
  }

  const timeFrame = getTimeFrame(pickedTimeFrame);
  const currentDateTime = new Date().toISOString();

  const { data, error } = await supabase
    .from("custom_events")
    .select("*, sessions (*)")
    .eq("website_url", website_url)
    .gte("created_at", timeFrame)
    .lte("created_at", currentDateTime)
    .order("created_at", { ascending: false })
    // Same ceiling as page views and sessions. Rows are one per property, so
    // the cap can split the oldest event's properties; newest come first.
    .limit(5000);

  if (!data || error) {
    return { data: null, error: "No data" };
  }

  const groupedData = groupEventsByEventId(data);

  return { data: groupedData, error };
}
