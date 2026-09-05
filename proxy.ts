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
    // api/live verifies the session itself (design §10) so a 10-second poll
    // does not pay the proxy's Supabase round trip on every tick.
    "/((?!_next/static|_next/image|favicon.ico|api/collect|api/live|js/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
