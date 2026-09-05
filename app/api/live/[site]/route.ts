import { type NextRequest, NextResponse } from "next/server";
import { authorizeLive, getLive, type LiveResult } from "@/lib/screens/live";
import { searchParamsToInput } from "@/lib/url-state";

/**
 * The poll behind Realtime (design §10): verifies the session itself, is
 * excluded from proxy.ts, and returns a discriminated result so the client
 * stops on "unauthenticated" instead of being redirected out from under a
 * scrolled page.
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ site: string }> }
) {
  const { site: slug } = await ctx.params;
  const auth = await authorizeLive(slug);
  if (auth.kind !== "ok") {
    const body: LiveResult = { kind: auth.kind };
    return NextResponse.json(body, {
      status: auth.kind === "unauthenticated" ? 401 : 403,
      headers: { "cache-control": "no-store" },
    });
  }
  const now = new Date();
  try {
    const data = await getLive(
      auth.site,
      searchParamsToInput(request.nextUrl.searchParams),
      now
    );
    const body: LiveResult = { kind: "ok", data, at: now.toISOString() };
    return NextResponse.json(body, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    console.error("[live] failed:", err);
    return NextResponse.json(
      { kind: "error" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
