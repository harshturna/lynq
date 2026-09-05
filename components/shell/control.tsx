import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The shell's small controls (design §6): a 30 px bordered button, its ghost,
 * dark and accent variants, and the segmented control.
 */
type Variant = "default" | "ghost" | "dark" | "accent";

const VARIANT: Record<Variant, string> = {
  default: "border-rule bg-canvas text-ink hover:bg-soft",
  ghost: "border-transparent text-mute hover:text-ink hover:bg-soft",
  dark: "border-ink bg-ink text-white hover:bg-ink-2",
  accent: "border-teal bg-teal text-white font-medium hover:bg-teal-ink",
};

export function Control({
  variant = "default",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-[30px] items-center gap-2 rounded-control border px-[10px] text-[13px] leading-none",
        "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
        VARIANT[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Caret() {
  return (
    <span aria-hidden className="text-[11px] text-faint">
      ▾
    </span>
  );
}

export type SegmentOption<T extends string> = { value: T; label: string };

/** A group of mutually exclusive buttons, e.g. Last 30 min / Last hour. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="inline-flex rounded-control bg-soft p-[2px]">
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-6 rounded-chip px-[9px] text-[12.5px] font-medium text-mute transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal",
            o.value === value &&
              "bg-canvas text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
          )}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-chip border border-rule px-[5px] py-[1px] font-sans text-[11px] text-mute">
      {children}
    </kbd>
  );
}
