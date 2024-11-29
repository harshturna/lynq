import {
  addCustomEvent,
  addPageView,
  addSession,
  addSessionDuration,
  addVisitor,
  addVitals,
  getCountryAndCityFromIp,
} from "@/lib/actions";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

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

    const ip = headers().get("x-forwarded-for");

    if (
      body.event === "session-start" ||
      body.event === "initial-custom-event"
    ) {
      const geoData = await getCountryAndCityFromIp(ip);

      if (body.event === "session-start") {
        await addVisitor(body.clientId, body.dataDomain);
        await addSession(
          body.sessionId,
          body.clientId,
          geoData,
          body.dataDomain,
          body.userAgentData
        );
        // capture the page view from initial session
        addPageView(
          body.dataDomain,
          body.url,
          body.sessionId,
          body.pathname,
          body.referrer
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
        addCustomEvent(
          body.dataDomain,
          body.sessionId,
          body.eventData,
          body.pathname
        );
      }
    } else if (body.event === "page-view") {
      addPageView(
        body.dataDomain,
        body.url,
        body.sessionId,
        body.pathname,
        body.referrer
      );
    } else if (body.event === "session-end") {
      console.log(body);
      addSessionDuration(
        body.dataDomain,
        body.sessionId,
        body.eventData.sessionDuration
      );
      addVitals(body.sessionId, body.dataDomain, body.eventData.metrics);
    } else if (body.event === "custom-event") {
      addCustomEvent(
        body.dataDomain,
        body.sessionId,
        body.eventData,
        body.pathname
      );
    }

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
