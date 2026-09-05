import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for the ingest path. It bypasses row-level security,
 * which is the point: the tracking endpoint has no user session and is the
 * single trusted writer of visitor, session, page view, vital and event rows.
 *
 * Server-only. The key must never reach the browser bundle, which is why it
 * has no NEXT_PUBLIC_ prefix and this module imports "server-only".
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set; the ingest route cannot write"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
