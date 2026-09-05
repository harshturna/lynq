import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Semantic status (design §6, rule 3): Badge for a change, Pill for a state.
 * Colour is never the only signal: badges carry ▲ ▼, pills carry a word.
 */
export type Direction = "up" | "down" | "flat";

export function Badge({
  direction,
  children,
  className,
}: {
  direction: Direction;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center whitespace-nowrap rounded-full px-[7px] text-[11.5px] font-semibold",
        direction === "up" && "bg-good-soft text-good",
        direction === "down" && "bg-poor-soft text-poor",
        direction === "flat" && "bg-soft text-ink-2",
        className
      )}
    >
      {direction === "up" ? "▲ " : direction === "down" ? "▼ " : ""}
      {children}
    </span>
  );
}

/** The change between two values as a badge; `lowerIsBetter` flips the colour, not the arrow. */
export function deltaOf(
  current: number,
  previous: number | null | undefined,
  opts: { lowerIsBetter?: boolean; points?: boolean } = {}
): { direction: Direction; text: string; good: boolean | null } | null {
  if (previous === null || previous === undefined || !Number.isFinite(previous))
    return null;
  const diff = current - previous;
  if (opts.points) {
    if (Math.abs(diff) < 0.05)
      return { direction: "flat", text: "no change", good: null };
    const good = opts.lowerIsBetter ? diff < 0 : diff > 0;
    return {
      direction: diff > 0 ? "up" : "down",
      text: `${Math.abs(diff).toFixed(1)} pts`,
      good,
    };
  }
  if (previous === 0)
    return {
      direction: current > 0 ? "up" : "flat",
      text: current > 0 ? "new" : "no change",
      good: current > 0 ? !opts.lowerIsBetter : null,
    };
  const pct = (diff / previous) * 100;
  if (Math.abs(pct) < 0.05)
    return { direction: "flat", text: "no change", good: null };
  const good = opts.lowerIsBetter ? pct < 0 : pct > 0;
  return {
    direction: pct > 0 ? "up" : "down",
    text: `${Math.abs(pct).toFixed(1)}%`,
    good,
  };
}

/** A badge coloured by whether the change is good, with the arrow showing its direction. */
export function DeltaBadge({
  current,
  previous,
  lowerIsBetter,
  points,
}: {
  current: number;
  previous: number | null | undefined;
  lowerIsBetter?: boolean;
  points?: boolean;
}) {
  const d = deltaOf(current, previous, { lowerIsBetter, points });
  if (!d) return null;
  const tone: Direction = d.good === null ? "flat" : d.good ? "up" : "down";
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center whitespace-nowrap rounded-full px-[7px] text-[11.5px] font-semibold",
        tone === "up" && "bg-good-soft text-good",
        tone === "down" && "bg-poor-soft text-poor",
        tone === "flat" && "bg-soft text-ink-2"
      )}
    >
      {d.direction === "up" ? "▲ " : d.direction === "down" ? "▼ " : ""}
      {d.text}
    </span>
  );
}

/** Inline delta text for table cells: "+9%" green or "−3%" red after the number. */
export function DeltaText({
  current,
  previous,
  lowerIsBetter,
}: {
  current: number;
  previous: number | null | undefined;
  lowerIsBetter?: boolean;
}) {
  const d = deltaOf(current, previous, { lowerIsBetter });
  if (!d || d.direction === "flat") return null;
  return (
    <span
      className={cn(
        "ml-[6px] text-[11.5px]",
        d.good ? "text-good" : "text-poor"
      )}
    >
      {d.direction === "up" ? "+" : "−"}
      {d.text}
    </span>
  );
}

export type PillStatus = "good" | "warn" | "poor" | "none";

export function Pill({
  status,
  children,
  className,
}: {
  status: PillStatus;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-[5px] whitespace-nowrap rounded-full px-2 text-[11px] font-semibold",
        "before:h-[6px] before:w-[6px] before:rounded-full before:bg-current before:content-['']",
        status === "good" && "bg-good-soft text-good",
        status === "warn" && "bg-warn-soft text-warn",
        status === "poor" && "bg-poor-soft text-poor",
        status === "none" && "bg-soft text-mute",
        className
      )}
    >
      {children}
    </span>
  );
}
