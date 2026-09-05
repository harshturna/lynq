import { cn } from "@/lib/utils";

/** Skeletons that match the final layout (design §12). Never a spinner in the page body. */
export function Bone({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn("animate-pulse rounded-chip bg-soft", className)}
    />
  );
}

export function StripSkeleton({ tiles = 5 }: { tiles?: number }) {
  return (
    <div
      className="grid border-t border-rule-strong min-[480px]:grid-cols-2 min-[1000px]:grid-cols-[repeat(var(--tiles),minmax(0,1fr))]"
      style={{ "--tiles": tiles } as React.CSSProperties}
    >
      {Array.from({ length: tiles }, (_, i) => (
        <div
          key={String(i)}
          className="flex flex-col gap-2 border-b border-r border-rule py-4 pr-4 last:border-r-0 min-[1000px]:mr-4 min-[1000px]:last:mr-0"
        >
          <Bone className="h-3 w-24" />
          <Bone className="mt-1 h-7 w-28" />
          <Bone className="mt-1 h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <Bone className="h-3 w-40" />
      <Bone style={{ height }} className="w-full rounded-control" />
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 3,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex gap-3">
        <Bone className="h-4 w-20" />
        <Bone className="h-4 w-12" />
      </div>
      <div className="border-t border-rule-strong" />
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={String(i)}
          className="flex items-center gap-4 border-b border-rule py-[9px]"
        >
          <Bone className="h-3 flex-1" />
          {Array.from({ length: columns }, (_, j) => (
            <Bone key={String(j)} className="h-3 w-14" />
          ))}
        </div>
      ))}
    </div>
  );
}
