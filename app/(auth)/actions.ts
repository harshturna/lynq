"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type State = {
  error: string | null;
  success: boolean;
  message?: string | null;
};

export async function login(
  prevState: State,
  formData: FormData
): Promise<State> {
  const supabase = await createClient();

  try {
    // Validate inputs
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return {
        error: "Email and password are required",
        success: false,
      };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        error: error.message,
        success: false,
      };
    }

    revalidatePath("/", "layout");
    return {
      error: null,
      success: true,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
      success: false,
    };
  }
}

export async function signUp(
  prevState: State,
  formData: FormData
): Promise<State> {
  const supabase = await createClient();

  try {
    // Validate inputs
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return {
        error: "Email and password are required",
        success: false,
      };
    }

    if (password.length < 6) {
      return {
        error: "Password must be at least 6 characters long",
        success: false,
      };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.log(error);
      return {
        error: error.message,
        success: false,
      };
    }

    // If successful and no confirmation required, revalidate and redirect
    revalidatePath("/", "layout");
    return {
      error: null,
      success: true,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
      success: false,
    };
  }
}
