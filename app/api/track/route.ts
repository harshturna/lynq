import { addVisitor } from "@/lib/actions";
import { headers } from "next/headers";
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
    }
  } catch (error) {
    console.log("[TRACK_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  const headersList = headers();
  console.log(headersList.get("x-forwarded-for"));

  return;
}
