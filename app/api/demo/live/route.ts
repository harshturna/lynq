import { NextResponse } from "next/server";
import { getDemoVisitorsNow } from "@/lib/screens/landing";

/** Visitors on the demo site now, public, cached for ten seconds (TICKET-057). */
export const dynamic = "force-dynamic";

export async function GET() {
  const visitorsNow = await getDemoVisitorsNow();
  return NextResponse.json(
    { visitorsNow },
    { headers: { "cache-control": "public, max-age=10, s-maxage=10" } }
  );
}
