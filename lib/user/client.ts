import { createClient as createBrowserClient } from "@/lib/supabase/client";

const supabase = createBrowserClient();

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function signOut() {
  return supabase.auth.signOut();
}
