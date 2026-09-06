"use client";

import { useId } from "react";
import { useFormStatus } from "react-dom";

/**
 * The auth form pieces (D-008): the onboarding's field and button vocabulary,
 * one column, the error under the fields as a live region.
 */
export const FIELD =
  "h-9 w-full rounded-control border border-rule bg-canvas px-3 text-[14px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal disabled:bg-soft disabled:text-mute";
export const PRIMARY =
  "inline-flex h-9 w-full items-center justify-center rounded-control bg-teal px-4 text-[14px] font-medium text-canvas hover:bg-teal-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-50";
/** The second call to action: a teal outline, a choice beside the primary. */
export const SECONDARY =
  "inline-flex h-9 w-full items-center justify-center rounded-control border border-teal px-4 text-[14px] font-medium text-teal-ink hover:bg-teal-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-50";

export function AuthCard({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-[380px]">
      <h1 className="text-[28px] font-medium leading-[1.15] tracking-[-0.02em]">
        {title}
      </h1>
      <p className="mt-2 text-[14px] leading-[1.5] text-ink-2">{lede}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function Field({
  label,
  name,
  type,
  autoComplete,
  placeholder,
  minLength,
}: {
  label: string;
  name: string;
  type: "email" | "password";
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-[6px]">
      <label htmlFor={id} className="text-[12.5px] font-medium text-ink-2">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        required
        className={FIELD}
      />
    </div>
  );
}

export function SubmitButton({
  children,
  pendingText,
}: {
  children: React.ReactNode;
  pendingText: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={PRIMARY}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  return (
    <p role="alert" className="text-[13px] text-poor empty:hidden">
      {message}
    </p>
  );
}
