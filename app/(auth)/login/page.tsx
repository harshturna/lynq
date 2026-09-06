"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  AuthCard,
  Field,
  FormError,
  SECONDARY,
  SubmitButton,
} from "../_auth/form";
import { login } from "../actions";

const initialState = { error: null, success: false };

export default function LoginPage() {
  const [state, action] = useActionState(login, initialState);
  const [guestPending, setGuestPending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.push("/sites");
    else if (state.error) setGuestPending(false);
  }, [state, router]);

  const guest = () => {
    setGuestPending(true);
    const form = new FormData();
    form.append("email", "guest@email.com");
    form.append("password", "guest@password");
    action(form);
  };

  return (
    <AuthCard
      title="Log in"
      lede="Your sites and their numbers, where you left them."
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
          autoComplete="current-password"
        />
        <FormError message={state.error} />
        <SubmitButton pendingText="Logging in…">Log in</SubmitButton>
      </form>
      <div className="relative my-6 text-center text-[12px] text-mute">
        <span className="absolute inset-x-0 top-1/2 border-t border-rule" />
        <span className="relative bg-canvas px-3">or</span>
      </div>
      <button
        type="button"
        onClick={guest}
        disabled={guestPending}
        className={SECONDARY}
      >
        {guestPending ? "Opening the live site…" : "See Lynq in action →"}
      </button>
      <p className="mt-8 text-[13.5px] text-ink-2">
        New to Lynq?{" "}
        <Link
          href="/sign-up"
          className="text-teal-ink underline underline-offset-[3px] hover:text-teal"
        >
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
