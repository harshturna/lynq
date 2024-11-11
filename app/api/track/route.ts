import {
  addPageView,
  addSession,
  addSessionDuration,
  addVisitor,
} from "@/lib/actions";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(req: Request) {
  console.log(req);
  // make sure the request is coming from the domain in data-domain
  try {
    const body: TTrackedEvent = await req.json();
    if (!body) {
      return;
    }

    if (body.event === "session-start") {
      let country = "Unknown";
      const ip = headers().get("x-forwarded-for");
      if (ip && ip !== "::1") {
        try {
          const response = await fetch(
            `http://ip-api.com/json/${ip}?fields=status,country`
          );
          const ipInfo = await response.json();
          console.log(ipInfo);
          if (ipInfo.country) {
            country = ipInfo.country;
          }
        } catch {}
      }

      await addVisitor(body.clientId, body.dataDomain);
      addSession(body.sessionId, body.clientId, country, body.dataDomain);
    } else if (body.event === "page-view") {
      addPageView(
        body.dataDomain,
        body.url,
        body.sessionId,
        body.pathname,
        body.referrer,
        body.userAgentData
      );
    } else if (body.event === "session-end") {
      addSessionDuration(
        body.dataDomain,
        body.sessionId,
        body.eventData.sessionDuration
      );
    }

    return new NextResponse("Success", { status: 200 });
  } catch (error) {
    console.log("[TRACK_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
