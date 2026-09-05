import { waitUntil } from "@vercel/functions";
import { isbot } from "isbot";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getGeoFromHeaders } from "@/lib/geo/request-geo";
import {
  addCustomEvent,
  addPageView,
  addSession,
  addSessionDuration,
  addVisitor,
  addVitals,
  getCountryAndCityFromIp,
} from "@/lib/ingest";
import { getClientIp } from "@/lib/ingest/client-ip";
import { adaptAndInsertV1 } from "@/lib/ingest/v1";

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };

  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };

  try {
    const body: TTrackedEvent = await req.json();
    if (!body) {
      return;
    }

    const host = origin?.startsWith("https://")
      ? origin.split("https://")[1]
      : origin?.startsWith("http://")
        ? origin.split("http://")[1]
        : origin;

    if (process.env.NEXT_PUBLIC_ENV === "dev") {
      body.dataDomain = process.env.NEXT_PUBLIC_DEV_DATA_DOMAIN || "";
    }

    if (
      (!host || host !== body.dataDomain) &&
      process.env.NEXT_PUBLIC_ENV !== "dev"
    ) {
      return NextResponse.json(
        { success: false },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const requestHeaders = await headers();

    // Crawlers, headless browsers and monitors execute the script too. Drop
    // them before any write, with the normal response so they learn nothing.
    if (isbot(requestHeaders.get("user-agent"))) {
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (
      body.event === "session-start" ||
      body.event === "initial-custom-event"
    ) {
      // Platform geo headers first: no network call, no rate limit. The IP
      // lookup only runs where no platform header exists (local dev).
      const geoData =
        getGeoFromHeaders(requestHeaders) ??
        (await getCountryAndCityFromIp(getClientIp(requestHeaders)));

      if (body.event === "session-start") {
        await addVisitor(body.clientId, body.dataDomain);
        await addSession(
          body.sessionId,
          body.clientId,
          geoData,
          body.dataDomain,
          body.userAgentData
        );
        // capture the page view from initial session; waitUntil keeps the
        // instance alive for the write without holding the response
        waitUntil(
          addPageView(
            body.dataDomain,
            body.url,
            body.sessionId,
            body.pathname,
            body.referrer
          )
        );
      } else {
        await addVisitor(body.clientId, body.dataDomain);
        await addSession(
          body.sessionId,
          body.clientId,
          geoData,
          body.dataDomain,
          body.userAgentData
        );
        waitUntil(
          addCustomEvent(
            body.dataDomain,
            body.sessionId,
            body.eventData,
            body.pathname
          )
        );
      }
    } else if (body.event === "page-view") {
      waitUntil(
        addPageView(
          body.dataDomain,
          body.url,
          body.sessionId,
          body.pathname,
          body.referrer
        )
      );
    } else if (body.event === "session-end") {
      await addSessionDuration(
        body.dataDomain,
        body.sessionId,
        body.eventData.sessionDuration
      );
      await addVitals(body.sessionId, body.dataDomain, body.eventData.metrics);
    } else if (body.event === "custom-event") {
      waitUntil(
        addCustomEvent(
          body.dataDomain,
          body.sessionId,
          body.eventData,
          body.pathname
        )
      );
    }

    // Dual-write into analytics.events (TICKET-015). Awaited, with its own
    // 2 s timeout, so the new table gets the same durability as the response.
    await adaptAndInsertV1(body, requestHeaders, new Date());

    return NextResponse.json(
      { success: true },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.log("[TRACK_ERROR]", error);
    return NextResponse.json(
      { success: false },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
