"use server";

import { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";

export async function addWebsite(name: string, url: string, userId: string) {
  const slug = url.replaceAll(".", "-");
  const supabase = await createClient();
  const response = await supabase
    .from("websites")
    .insert({ name, url, user_id: userId, slug });

  return response;
}

export async function getAllWebsites(userId: string): Promise<{
  data: Website[] | null;
  error: PostgrestError | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("user_id", userId);

  return { data, error };
}

export async function getWebsite(
  website_slug: string,
  user_id: string
): Promise<{
  data: Website | null;
  error: PostgrestError | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("slug", website_slug)
    .eq("user_id", user_id)
    .single();

  return { data, error };
}

export async function updateWebsiteOne(
  website_slug: string,
  column: string,
  value: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("websites")
    .update({ [column]: value })
    .eq("slug", website_slug);

  return error;
}
