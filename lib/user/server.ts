import { cache } from "react";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Deduped per-request: layout and page both call getUser, this avoids
// hitting the Supabase auth endpoint twice for the same render
export const getUser = cache(async () => {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});
