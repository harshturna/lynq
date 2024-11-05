import { createClient as createServerClient } from "@/lib/supabase/server";

export async function getUser() {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
