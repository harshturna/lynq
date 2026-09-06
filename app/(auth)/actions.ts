"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error: string | null;
  success: boolean;
  /** Set when the account exists but must be confirmed by email before it can log in. */
  message?: string | null;
};

/** Supabase's messages, in the product's words where they are user-facing. */
function plain(message: string): string {
  if (/invalid login credentials/i.test(message))
    return "That email and password do not match.";
  if (/email not confirmed/i.test(message))
    return "Confirm your email first; the link is in your inbox.";
  if (/already registered/i.test(message))
    return "There is already an account with that email. Log in instead.";
  if (/rate limit/i.test(message))
    return "Too many attempts. Wait a minute and try again.";
  return message;
}

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password)
    return { error: "Enter your email and password.", success: false };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: plain(error.message), success: false };
    revalidatePath("/", "layout");
    return { error: null, success: true };
  } catch (e) {
    return {
      error: e instanceof Error ? plain(e.message) : "Something went wrong.",
      success: false,
    };
  }
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password)
    return { error: "Enter an email and a password.", success: false };
  if (password.length < 6)
    return {
      error: "The password needs at least 6 characters.",
      success: false,
    };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: plain(error.message), success: false };
    // With email confirmation on, sign-up returns a user and no session.
    if (!data.session)
      return {
        error: null,
        success: true,
        message: `We sent a confirmation link to ${email}. Open it, then log in.`,
      };
    revalidatePath("/", "layout");
    return { error: null, success: true };
  } catch (e) {
    return {
      error: e instanceof Error ? plain(e.message) : "Something went wrong.",
      success: false,
    };
  }
}
