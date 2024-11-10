import {
  addPageView,
  addSession,
  addSessionDuration,
  addVisitor,
} from "@/lib/actions";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // make sure the request is coming from the domain in data-domain
  try {
    const body: TTrackedEvent = await req.json();
    if (!body) {
      return;
    }

    if (body.event === "session-start") {
      addVisitor(body.clientId, body.dataDomain);
      addSession(body.sessionId, body.dataDomain);
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
