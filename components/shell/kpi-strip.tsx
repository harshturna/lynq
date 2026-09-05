"use client";

import Link from "next/link";
import { type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The KPI strip (design §6): tiles separated by rules under one heavy rule.
 * The tiles are a radiogroup of native radios named "Metric" (arrow keys move
 * between them for free); the checked tile drives the lead chart. A tile never navigates itself; a small explicit link does. Under
 * 480 px the strip is one snapping row.
 */
export type KpiTile = {
  key: string;
  label: string;
  value: ReactNode;
  /** A DeltaBadge or similar. */
  delta?: ReactNode;
  /** "vs 11,534" and the like. */
  note?: ReactNode;
  /** An explicit "→ Pages" link beside the label. */
  href?: string;
  hrefLabel?: string;
  /** A ghost tile: renders as a link with a call to action instead of a number. */
  ghost?: { href: string; text: string };
};

export function KpiStrip({
  tiles,
  value,
  onChange,
  label = "Metric",
}: {
  tiles: KpiTile[];
  /** The checked tile; omit both value and onChange for a static strip with nothing to drive. */
  value?: string;
  onChange?: (key: string) => void;
  label?: string;
}) {
  const groupName = useId();
  const interactive = Boolean(onChange);

  return (
    <div
      {...(interactive
        ? { role: "radiogroup", "aria-label": label }
        : { role: "region", "aria-label": label, tabIndex: 0 })}
      className={cn(
        "relative grid border-t border-rule-strong",
        "max-[479px]:flex max-[479px]:snap-x max-[479px]:snap-mandatory max-[479px]:overflow-x-auto",
        "min-[480px]:grid-cols-2 min-[1000px]:grid-cols-[repeat(var(--tiles),minmax(0,1fr))]"
      )}
      style={{ "--tiles": tiles.length } as React.CSSProperties}
    >
      {tiles.map((t) => {
        const checked = interactive && t.key === value;
        return (
          <div
            key={t.key}
            className={cn(
              "relative flex flex-col gap-[6px] border-b border-r border-rule py-4 pr-4 last:border-r-0",
              "min-[1000px]:mr-4 min-[1000px]:last:mr-0",
              "max-[479px]:w-[220px] max-[479px]:shrink-0 max-[479px]:snap-start max-[479px]:px-3",
              checked && "shadow-[inset_0_-2px_0_var(--teal)]"
            )}
          >
            <div className="flex items-center justify-between gap-2 text-[12px] text-mute">
              <span className={cn(checked && "font-medium text-teal-ink")}>
                {t.label}
              </span>
              {t.href && (
                <Link
                  href={t.href}
                  className="text-[12px] text-teal-ink hover:underline"
                >
                  → {t.hrefLabel ?? "Open"}
                </Link>
              )}
            </div>
            {t.ghost ? (
              <Link
                href={t.ghost.href}
                className="mt-1 text-[15px] font-medium text-teal-ink hover:underline"
              >
                {t.ghost.text} →
              </Link>
            ) : !interactive ? (
              <span className="block text-[30px] font-medium leading-none tracking-[-0.02em] text-ink tabular max-[479px]:text-[24px]">
                {t.value}
              </span>
            ) : (
              <label className="block cursor-pointer rounded-chip has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal">
                <input
                  type="radio"
                  name={groupName}
                  value={t.key}
                  checked={checked}
                  onChange={() => onChange?.(t.key)}
                  className="sr-only"
                />
                <span className="sr-only">{t.label}: </span>
                <span className="block text-[30px] font-medium leading-none tracking-[-0.02em] text-ink tabular max-[479px]:text-[24px]">
                  {t.value}
                </span>
              </label>
            )}
            {(t.delta || t.note) && (
              <div className="mt-1 flex items-center gap-2 text-[12.5px] text-mute">
                {t.delta}
                {t.note}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
