import "server-only";
import { createAdminClient } from "./supabase/admin";

// Write path for the tracking endpoint. Not a "use server" module on purpose:
// these functions run with the service-role key and must never be exposed as
// callable server actions. Only app/api/lynq/route.ts imports them.

type ValidPropertyValue = string | number | boolean | undefined | null;

type CustomEvent = {
  name: string;
  properties?: object | null | undefined;
  eventId: string;
};

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

export async function addVisitor(clientId: string, website_url: string) {
  const supabase = createAdminClient();

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
    // Scoped to the site: the same client id exists on every site the
    // browser has visited, and the Visitors card counts rows by last_visited
    await supabase
      .from("visitors")
      .update({ last_visited: currentDateTime })
      .eq("client_id", clientId)
      .eq("website_url", website_url);
  }
}

export async function addPageView(
  website_url: string,
  page: string,
  session_id: string,
  pathname: string,
  referrer: string | null
) {
  const supabase = createAdminClient();

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
  const supabase = createAdminClient();
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
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("sessions")
    .select("session_duration")
    .eq("website_url", website_url)
    .eq("session_id", session_id)
    .single();
  const updatedDuration = (data?.session_duration || 0) + session_duration;

  const { data: updateData, error: updateError } = await supabase
    .from("sessions")
    .update({ session_duration: updatedDuration })
    .eq("website_url", website_url)
    .eq("session_id", session_id);

  return { updateData, updateError };
}

export async function addVitals(
  session_id: string,
  website_url: string,
  vitals: WebVitalsEventData
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("vitals").insert({
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

  return { data, error };
}

export async function addCustomEvent(
  websiteUrl: string,
  sessionId: string,
  event: CustomEvent,
  pathName: string
) {
  const supabase = createAdminClient();

  if (!event.properties) {
    const { data, error } = await supabase.from("custom_events").insert({
      website_url: websiteUrl,
      event_name: event.name,
      event_id: event.eventId,
      session_id: sessionId,
      page_url: pathName,
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
