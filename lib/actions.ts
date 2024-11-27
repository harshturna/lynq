"use server";

import { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { getUser } from "./user/server";
import {
  addSessionDataToAnalytics,
  calculateAverageSessionDuration,
  calculateAverageVital,
  calculateBounceRate,
  getTimeFrame,
  groupEventsByEventId,
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

  if (user_id === process.env.GUEST_USER_ID)
    return "You cannot perform this action as guest";

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
    return "You cannot perform this action as guest";

  const { error } = await supabase
    .from("websites")
    .delete()
    .eq("slug", website_slug)
    .eq("user_id", user_id);

  return error;
}

export async function getCountryAndCityFromIp(ip: string | null) {
  if (!ip || ip === "::1") return { country: "Unknown", city: "Unknown" };
  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,city`
    );

    const res = { country: "Unknown", city: "Unknown" };
    const ipInfo = await response.json();
    if (ipInfo.country) {
      res.country = ipInfo.country;
    }
    if (ipInfo.city) {
      res.city = ipInfo.city;
    }
    return res;
  } catch {
    return { country: "Unknown", city: "Unknown" };
  }
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
  referrer: string | null
) {
  const supabase = await createClient();

  await supabase.from("page_views").insert({
    website_url,
    page,
    session_id,
    pathname,
    referrer,
  });
}

export async function addSession(
  session_id: string,
  client_id: string,
  geoData: {
    country: string;
    city: string;
  },
  website_url: string,
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
  await supabase.from("sessions").insert({
    website_url,
    session_id,
    client_id,
    country: geoData.country,
    city: geoData.city,
    device,
    browser: userAgentData.browser,
    operating_system: userAgentData.os,
  });
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
          .select("*")
          .eq("website_url", website_url)
          .gte("created_at", timeFrame)
          .lte("created_at", currentDateTime),
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

export async function addVitals(
  session_id: string,
  website_url: string,
  vitals: WebVitalsEventData
) {
  const supabase = await createClient();
  await supabase.from("vitals").insert({
    website_url,
    session_id,
    lcp: vitals.lcp,
    cls: vitals.cls,
    inp: vitals.inp,
    fcp: vitals.fcp,
    ttfb: vitals.ttfb,
    tbt: vitals.tbt,
    dcl: vitals.dcl,
    load: vitals.load,
    tti: vitals.tti,
    interaction_count: vitals.interactionCount,
    resource_count: vitals.resourceCount,
    total_js_heap: vitals.totalJSHeapSize,
    used_js_heap: vitals.usedJSHeapSize,
  });
}

export async function getVitals(
  pickedTimeFrame: DatePickerValues,
  website_url: string,
  user_id: string
): Promise<{
  data: (WebVitalsMetrics & { size: number }) | null;
  error: PostgrestError | null | string;
}> {
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  if (!user?.id) {
    return { data: null, error: "Unauthorized User" };
  }
  if (user_id !== user.id) {
    return { data: null, error: "Unauthorized User" };
  }

  const timeFrame = getTimeFrame(pickedTimeFrame);
  const currentDateTime = new Date().toISOString();

  const { data, error } = await supabase
    .from("vitals")
    .select("*")
    .eq("website_url", website_url)
    .gte("created_at", timeFrame)
    .lte("created_at", currentDateTime);

  if (!data) {
    return { data: null, error: "No data" };
  }

  return { data: calculateAverageVital(data), error: null };
}

// Custom Events

type ValidPropertyValue = string | number | boolean | undefined | null;

type CustomEvent = {
  name: string;
  properties?: object | null | undefined;
  eventId: string;
};

export async function addCustomEvent(
  websiteUrl: string,
  sessionId: string,
  event: CustomEvent
) {
  const supabase = await createClient();

  if (!event.properties) {
    const { data, error } = await supabase.from("custom_events").insert({
      website_url: websiteUrl,
      event_name: event.name,
      event_id: event.eventId,
      session_id: sessionId,
    });
    return { data, error };
  }

  const events = Object.entries(event.properties)
    .map(([key, value]) => ({
      website_url: websiteUrl,
      event_name: event.name,
      property_name: key,
      property_value: value,
      session_id: sessionId,
      event_id: event.eventId,
    }))
    .filter(
      (event): event is typeof event & { property_value: ValidPropertyValue } =>
        typeof event.property_value === "boolean" ||
        typeof event.property_value === "string" ||
        typeof event.property_value === "number" ||
        event.property_value === undefined ||
        event.property_value === null
    );

  if (events.length > 0) {
    const { data, error } = await supabase.from("custom_events").insert(events);
    return { data, error };
  }

  return { data: null, error: null };
}

export async function getCustomEventData(
  pickedTimeFrame: DatePickerValues,
  website_url: string,
  user_id: string
): Promise<{
  data: GroupedCustomEventWithSessionData[] | null;
  error: PostgrestError | null | string;
}> {
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  if (!user?.id) {
    return { data: null, error: "Unauthorized User" };
  }
  if (user_id !== user.id) {
    return { data: null, error: "Unauthorized User" };
  }

  const timeFrame = getTimeFrame(pickedTimeFrame);
  const currentDateTime = new Date().toISOString();

  const { data, error } = await supabase
    .from("custom_events")
    .select("*, sessions (*)")
    .eq("website_url", website_url)
    .gte("created_at", timeFrame)
    .lte("created_at", currentDateTime)
    .order("created_at", { ascending: false });

  if (!data || error) {
    return { data: null, error: "No data" };
  }

  const groupedData = groupEventsByEventId(data);

  return { data: groupedData, error };
}
