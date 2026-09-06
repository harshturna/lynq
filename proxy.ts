import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    // api/collect and js/ are public: the ingest endpoint and the
    // tracker script must never be redirected to /login or cost an auth call.
    // api/demo is public (the landing page's demo numbers, TICKET-057).
    // api/live verifies the session itself (design §10) so a 10-second poll
    // does not pay the proxy's Supabase round trip on every tick.
    // api/bots, api/notes and api/mcp are keyed endpoints (D-017): the key is
    // the authentication and there is no session to refresh, so the proxy
    // must not redirect them to /login (TICKET-088).
    "/((?!_next/static|_next/image|favicon.ico|api/collect|api/live|api/demo|api/bots|api/notes|api/mcp|js/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
