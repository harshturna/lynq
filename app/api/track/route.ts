import {
  addPageView,
  addSession,
  addSessionDuration,
  addVisitor,
  getCountryFromIp,
} from "@/lib/actions";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(req: Request) {
  // make sure the request is coming from the domain in data-domain
  try {
    const body: TTrackedEvent = await req.json();
    if (!body) {
      return;
    }

    if (body.event === "web-vitals") {
      console.log(body.eventData.resources);
    }

    const ip = headers().get("x-forwarded-for");

    if (body.event === "session-start") {
      const country = await getCountryFromIp(ip);

      await addVisitor(body.clientId, body.dataDomain);
      await addSession(body.sessionId, body.clientId, country, body.dataDomain);
      // capture the page view from initial session
      addPageView(
        body.dataDomain,
        body.url,
        body.sessionId,
        body.pathname,
        body.referrer,
        body.userAgentData
      );
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
