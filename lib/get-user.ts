import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

type ContextType = "SERVER_COMPONENT" | "CLIENT_COMPONENT";

export async function getUser(context: ContextType) {
  if (context === "SERVER_COMPONENT") {
    const supabase = await createServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
  }

  if (context === "CLIENT_COMPONENT") {
    const supabase = createBrowserClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
  }
}
