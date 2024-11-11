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

    const ip = headers().get("x-forwarded-for");

    if (body.event === "session-start" || body.event === "page-view") {
      const country = await getCountryFromIp(ip);

      if (body.event === "session-start") {
        await addVisitor(body.clientId, body.dataDomain);
        await addSession(
          body.sessionId,
          body.clientId,
          country,
          body.dataDomain
        );
      } else if (body.event === "page-view" && body.eventData.isInitial) {
        await addVisitor(body.clientId, body.dataDomain);
        await addSession(
          body.sessionId,
          body.clientId,
          country,
          body.dataDomain
        );
        addPageView(
          body.dataDomain,
          body.url,
          body.sessionId,
          body.pathname,
          body.referrer,
          body.userAgentData
        );
      } else {
        addPageView(
          body.dataDomain,
          body.url,
          body.sessionId,
          body.pathname,
          body.referrer,
          body.userAgentData
        );
      }
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
