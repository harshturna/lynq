import { addPageView, addVisitor } from "@/lib/actions";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // make sure the request is coming from the domain in data-domain
  try {
    const body: TTrackedEvent = await req.json();
    if (!body) {
      return;
    }

    switch (body.event) {
      case "session-start":
        addVisitor(body.clientId, body.dataDomain);

      case "page-view":
        addPageView(
          body.dataDomain,
          body.url,
          body.sessionId,
          body.userAgentData
        );
    }

    return new NextResponse("Success", { status: 200 });
  } catch (error) {
    console.log("[TRACK_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
