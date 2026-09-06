"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { AuthCard, Field, FormError, SubmitButton } from "../_auth/form";
import { signUp } from "../actions";

const initialState = { error: null, success: false, message: null };

export default function SignUpPage() {
  const [state, action] = useActionState(signUp, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success && !state.message) router.push("/sites");
  }, [state, router]);

  if (state.success && state.message)
    return (
      <AuthCard title="Check your email" lede={state.message}>
        <p className="text-[13.5px] text-ink-2">
          Already confirmed?{" "}
          <Link
            href="/login"
            className="text-teal-ink underline underline-offset-[3px] hover:text-teal"
          >
            Log in
          </Link>
        </p>
      </AuthCard>
    );

  return (
    <AuthCard
      title="Create your account"
      lede="Always free. One script tag, no cookies, no consent banner."
    >
      <form action={action} className="flex flex-col gap-4">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          minLength={6}
        />
        <FormError message={state.error} />
        <SubmitButton pendingText="Creating your account…">
          Create account
        </SubmitButton>
      </form>
      <p className="mt-8 text-[13.5px] text-ink-2">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-teal-ink underline underline-offset-[3px] hover:text-teal"
        >
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
