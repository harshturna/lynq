import type { ReactNode } from "react";

/**
 * The page header (design §6): title, subtitle line, controls on the right.
 * The controls region is what the `[` and `]` shortcuts are scoped to.
 */
export function PageHeader({
  title,
  subtitle,
  controls,
}: {
  title: string;
  subtitle?: ReactNode;
  controls?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-medium leading-[1.1] tracking-[-0.02em] text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-[6px] text-[13px] text-mute">{subtitle}</p>
        )}
      </div>
      {controls && (
        <div data-shell-controls className="flex flex-wrap items-center gap-2">
          {controls}
        </div>
      )}
    </div>
  );
}

export function LiveDot({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[6px] text-ink-2">
      <span
        aria-hidden
        className="inline-block h-[7px] w-[7px] rounded-full bg-good shadow-[0_0_0_3px_var(--good-soft)]"
      />
      {children}
    </span>
  );
}
