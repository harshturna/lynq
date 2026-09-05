import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A section title with an optional muted qualifier and a right slot (design §6). Rules, never boxes. */
export function Section({
  title,
  qualifier,
  right,
  strong,
  children,
  className,
}: {
  title: ReactNode;
  qualifier?: ReactNode;
  right?: ReactNode;
  /** Draw the heavy rule above the section. */
  strong?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(strong && "border-t border-rule-strong pt-3", className)}
    >
      <div className="mb-2 flex items-center gap-3 text-[14px] font-medium text-ink">
        <h2 className="text-[14px] font-medium">{title}</h2>
        {qualifier && (
          <span className="text-[12.5px] font-normal text-mute">
            {qualifier}
          </span>
        )}
        {right && (
          <div className="ml-auto flex items-center gap-[14px] text-[12px] text-mute">
            {right}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

/** A ranked list row with a share bar behind it, for side panels (design §6 RowBar). */
export function RowBar({
  label,
  value,
  share,
  onClick,
  selected,
}: {
  label: ReactNode;
  value: ReactNode;
  /** 0 to 100, relative to the top row. */
  share: number;
  onClick?: () => void;
  selected?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      className={cn(
        "relative grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-1 text-left text-[12.5px]",
        onClick &&
          "rounded-chip hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal"
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 rounded-[3px] bg-teal-bar"
        style={{ width: `${Math.max(0, Math.min(100, share))}%` }}
      />
      <span
        className={cn(
          "relative truncate pl-[6px] text-ink-2",
          selected && "font-medium text-teal-ink"
        )}
      >
        {label}
      </span>
      <span className="relative pr-[6px] font-medium text-ink tabular">
        {value}
      </span>
    </Tag>
  );
}
