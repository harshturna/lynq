"use client";

import { type ReactNode, useId } from "react";
import { fmtNumber } from "@/lib/charts/format";
import { funnelThreshold } from "@/lib/charts/thresholds";
import { cn } from "@/lib/utils";
import { DeltaBadge } from "./badge";
import { RowBar } from "./section";

/**
 * The HTML views (design §7): shapes that are clearer as markup than as a
 * chart. Every number is in the DOM, nothing here is aria-hidden.
 */

export type FlowRow = { key: string; label: string; count: number };

/** Came from › node › went to: two ranked RowBar lists around a node (§8.3). */
export function FlowPanel({
  node,
  from,
  to,
  fromLabel = "Came from",
  toLabel = "Went to",
  onPick,
}: {
  node: { label: string; count: number; qualifier?: string };
  from: FlowRow[];
  to: FlowRow[];
  fromLabel?: string;
  toLabel?: string;
  onPick?: (row: FlowRow, side: "from" | "to") => void;
}) {
  const fromMax = Math.max(1, ...from.map((r) => r.count));
  const toMax = Math.max(1, ...to.map((r) => r.count));
  const list = (
    rows: FlowRow[],
    max: number,
    side: "from" | "to",
    heading: string
  ) => (
    <div className="min-w-0">
      <h4 className="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-mute">
        {heading}
      </h4>
      {rows.length === 0 ? (
        <p className="py-1 text-[12.5px] text-mute">Nothing yet.</p>
      ) : (
        <ol className="flex flex-col gap-0.5">
          {rows.map((r) => (
            <li key={r.key}>
              <RowBar
                label={<span className="truncate">{r.label}</span>}
                value={<span className="tabular">{fmtNumber(r.count)}</span>}
                share={(r.count / max) * 100}
                onClick={onPick ? () => onPick(r, side) : undefined}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
  return (
    <div className="grid gap-4 min-[641px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] min-[641px]:items-start">
      {list(from, fromMax, "from", fromLabel)}
      <div className="flex flex-col items-center justify-center gap-1 self-center rounded-card border border-rule-strong px-4 py-3 text-center">
        <span className="max-w-[180px] truncate text-[13px] font-medium">
          {node.label}
        </span>
        <span className="text-[20px] font-medium leading-none tabular">
          {fmtNumber(node.count)}
        </span>
        {node.qualifier && (
          <span className="text-[11px] text-mute">{node.qualifier}</span>
        )}
      </div>
      {list(to, toMax, "to", toLabel)}
    </div>
  );
}

export type FunnelStep = { key: string; label: string; count: number };

/** An ordered list of steps with bars and drop-off text (§8.8). */
export function Funnel({
  steps,
  title,
}: {
  steps: FunnelStep[];
  title?: string;
}) {
  const first = steps[0]?.count ?? 0;
  const check = funnelThreshold(first);
  const id = useId();
  if (!check.ok)
    return (
      <p className="py-6 text-center text-[13px] text-mute">{check.reason}</p>
    );
  return (
    <ol
      aria-labelledby={title ? id : undefined}
      className="flex flex-col gap-3"
    >
      {title && (
        <span id={id} className="sr-only">
          {title}
        </span>
      )}
      {steps.map((s, i) => {
        const prev = steps[i - 1]?.count ?? 0;
        const share = first ? (s.count / first) * 100 : 0;
        const drop = i > 0 && prev ? ((prev - s.count) / prev) * 100 : null;
        return (
          <li
            key={s.key}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1"
          >
            <span className="flex items-baseline gap-2 text-[13px]">
              <span className="text-[11px] tabular text-mute">{i + 1}</span>
              <span className="truncate">{s.label}</span>
            </span>
            <span className="text-[13px] tabular">
              {fmtNumber(s.count)}
              <span className="ml-1.5 text-mute">
                {first ? `${share.toFixed(0)}%` : "—"}
              </span>
            </span>
            <div className="col-span-2 h-2 overflow-hidden rounded-[3px] bg-soft">
              <div
                className={cn(
                  "h-full rounded-[3px]",
                  i === steps.length - 1 ? "bg-teal" : "bg-teal-2"
                )}
                style={{ width: `${Math.max(1, share)}%` }}
              />
            </div>
            {drop !== null && (
              <span className="col-span-2 text-[11.5px] text-mute">
                {drop <= 0
                  ? "No drop-off"
                  : `${drop.toFixed(0)}% dropped off after ${steps[i - 1]?.label.toLowerCase()}`}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export type PathItem = { key: string; steps: string[]; count: number };

/** Ranked sequences that end in an event or page (§8.7). */
export function PathList({
  paths,
  endLabel,
  onPick,
}: {
  paths: PathItem[];
  endLabel?: string;
  onPick?: (p: PathItem) => void;
}) {
  const max = Math.max(1, ...paths.map((p) => p.count));
  if (paths.length === 0)
    return <p className="py-2 text-[12.5px] text-mute">No paths yet.</p>;
  return (
    <ol className="flex flex-col gap-1">
      {paths.map((p) => {
        const Tag = onPick ? "button" : "div";
        return (
          <li key={p.key}>
            <Tag
              type={onPick ? "button" : undefined}
              onClick={onPick ? () => onPick(p) : undefined}
              className={cn(
                "relative grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1.5 text-left",
                onPick &&
                  "rounded-chip hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal"
              )}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-[3px] bg-teal-bar"
                style={{ width: `${(p.count / max) * 100}%` }}
              />
              <span className="relative flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12.5px]">
                {p.steps.map((s, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: a path can visit the same page twice; steps never reorder
                  <span key={`${i}-${s}`} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <span aria-hidden className="text-faint">
                        ›
                      </span>
                    )}
                    <span
                      className={cn(
                        "truncate",
                        i === p.steps.length - 1 && "font-medium"
                      )}
                    >
                      {s}
                    </span>
                  </span>
                ))}
                {endLabel && (
                  <>
                    <span aria-hidden className="text-faint">
                      ›
                    </span>
                    <span className="rounded-chip bg-teal-soft px-1.5 py-px text-[11.5px] font-medium text-teal-ink">
                      {endLabel}
                    </span>
                  </>
                )}
              </span>
              <span className="relative text-[12.5px] tabular">
                {fmtNumber(p.count)}
              </span>
            </Tag>
          </li>
        );
      })}
    </ol>
  );
}

export type MatrixData = {
  rows: string[];
  cols: string[];
  cells: (number | null)[][];
  unit?: string;
};

/** A real table with cells shaded by share of the largest (§8.6 browser × OS). */
export function Matrix({
  title,
  rowHeader,
  data,
  format = fmtNumber,
}: {
  title: string;
  rowHeader: string;
  data: MatrixData;
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.cells.flat().map((v) => v ?? 0));
  return (
    <section
      aria-label={title}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region is keyboard-reachable (design §6)
      tabIndex={0}
      className="relative overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
    >
      <table className="w-full border-collapse text-[12.5px]">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="py-1.5 pr-3 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-mute"
            >
              {rowHeader}
            </th>
            {data.cols.map((c) => (
              <th
                key={c}
                scope="col"
                className="min-w-[72px] py-1.5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-mute"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={r} className="border-t border-rule">
              <th
                scope="row"
                className="py-1.5 pr-3 text-left font-normal text-ink"
              >
                {r}
              </th>
              {data.cols.map((c, j) => {
                const v = data.cells[i]?.[j] ?? null;
                const t = v === null ? 0 : v / max;
                return (
                  <td
                    key={c}
                    className="py-1.5 text-right tabular"
                    style={
                      v === null
                        ? undefined
                        : {
                            backgroundColor: `rgba(15,118,110,${(0.04 + t * 0.4).toFixed(3)})`,
                          }
                    }
                  >
                    {v === null ? (
                      <span className="text-faint">—</span>
                    ) : (
                      format(v)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export type Segment = {
  key: string;
  label: string;
  value: number;
  previous?: number;
};

const SEGMENT_CLASSES = ["bg-teal", "bg-teal-2", "bg-teal-3", "bg-soft-2"];

/** Teal at a descending strength per segment, for more segments than the four device classes. */
function rampStyle(i: number, n: number): React.CSSProperties {
  const strength = n <= 1 ? 80 : 80 - (72 * i) / (n - 1);
  return {
    background: `color-mix(in srgb, var(--teal) ${strength}%, transparent)`,
  };
}

/**
 * One bar split by share with a legend that carries the deltas (§8.6 device
 * split). `ramp` shades the segments from strong to faint in order, for the
 * Pages attention line (D-011).
 */
export function SplitBar({
  title,
  segments,
  compare,
  format = fmtNumber,
  ramp = false,
}: {
  title: string;
  segments: Segment[];
  compare?: boolean;
  format?: (v: number) => string;
  ramp?: boolean;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const share = (v: number) => (total ? (v / total) * 100 : 0);
  const name = segments
    .map((s) => `${s.label} ${share(s.value).toFixed(0)}%`)
    .join(", ");
  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={`${title}: ${name || "no data"}`}
        className="flex h-3 w-full gap-px overflow-hidden rounded-[3px] bg-soft"
      >
        {segments.map((s, i) => (
          <span
            key={s.key}
            className={cn(
              "h-full",
              !ramp && SEGMENT_CLASSES[i % SEGMENT_CLASSES.length]
            )}
            style={{
              width: `${share(s.value)}%`,
              ...(ramp ? rampStyle(i, segments.length) : {}),
            }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[12.5px]">
        {segments.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "inline-block h-2.5 w-2.5 rounded-[2px]",
                !ramp && SEGMENT_CLASSES[i % SEGMENT_CLASSES.length]
              )}
              style={ramp ? rampStyle(i, segments.length) : undefined}
            />
            <span>{s.label}</span>
            <span className="tabular text-ink-2">
              {total ? `${share(s.value).toFixed(1)}%` : "—"} ·{" "}
              {format(s.value)}
            </span>
            {compare && s.previous !== undefined && (
              <DeltaBadge current={s.value} previous={s.previous} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ViewLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-mute">
      {children}
    </span>
  );
}
