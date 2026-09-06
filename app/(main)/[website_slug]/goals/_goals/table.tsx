"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChangeSlot } from "@/components/shell/badge";
import { SectionError } from "@/components/shell/section-error";
import { useAnnounce, useViewState } from "@/components/shell/view-state";
import { fmtInt, fmtRatio, fmtRevenue } from "@/lib/format";
import { setKpi } from "@/lib/screens/goal-actions";
import type { GoalRow } from "@/lib/screens/goals";
import type { Kpi } from "@/lib/screens/kpi";
import type { Section as Settled } from "@/lib/screens/settle";
import { withParam } from "@/lib/url-state";
import { cn } from "@/lib/utils";
import { GoalForm } from "./form";

/** The goals table (design §8.8, D-013): name, definition, completions, conversion, revenue when any goal has it, KPI star. */
export function GoalsTable({
  slug,
  isGuest,
  kpi,
  compare,
  goals,
}: {
  slug: string;
  isGuest: boolean;
  kpi: Kpi;
  compare: boolean;
  goals: Settled<GoalRow[]>;
}) {
  const { state, update, pending } = useViewState();
  const announce = useAnnounce();
  const router = useRouter();
  const [starPending, startStar] = useTransition();
  const [notice, setNotice] = useState("");
  if (!goals.ok) return <SectionError title="Goals" strong />;
  const rows = goals.data;
  const star = (id: number, on: boolean) =>
    startStar(async () => {
      setNotice("");
      const res = await setKpi(slug, on ? id : null);
      if (!res.ok) return setNotice(res.error);
      announce(on ? "KPI set." : "KPI cleared.");
      router.refresh();
    });
  const anyRevenue = rows.some((g) => g.revenue);
  const th =
    "whitespace-nowrap border-b border-rule py-2 pl-4 text-right text-[11.5px] font-normal text-mute";
  const newGoal = (
    <GoalForm
      slug={slug}
      isGuest={isGuest}
      trigger={
        <button
          type="button"
          className="inline-flex h-[30px] items-center gap-2 rounded-control border border-teal bg-teal px-[10px] text-[13px] font-medium leading-none text-canvas hover:bg-teal-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        >
          + New goal
        </button>
      }
    />
  );
  return (
    <div
      aria-busy={pending || starPending}
      className={
        pending || starPending
          ? "opacity-70 transition-opacity"
          : "transition-opacity"
      }
    >
      <div className="flex items-end gap-3 border-b border-rule-strong">
        <h2 className="pb-[7px] text-[14px] font-medium">Goals</h2>
        <span className="pb-[7px] text-[12.5px] text-mute">
          {rows.length ? "the starred goal is the KPI" : "none yet"}
        </span>
        <div className="ml-auto pb-[6px]">{newGoal}</div>
      </div>
      {notice && <p className="pt-2 text-[12px] text-poor">{notice}</p>}
      {rows.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-mute">
          No goals yet. A goal is a page seen or an event fired; the KPI one
          drives the Overview.
        </p>
      ) : (
        <section
          aria-label="Goals table"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region is keyboard-reachable (design §6)
          tabIndex={0}
          className="relative overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        >
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th
                  scope="col"
                  className={cn(
                    th,
                    "w-full min-w-[120px] max-w-0 pl-0 text-left"
                  )}
                >
                  Goal
                </th>
                <th scope="col" className={cn(th, "text-left")}>
                  Completes when
                </th>
                <th scope="col" className={th}>
                  Completions
                </th>
                {compare && (
                  <th scope="col" className={cn(th, "w-[64px] pl-3 text-left")}>
                    <span className="sr-only">change</span>
                  </th>
                )}
                <th scope="col" className={th}>
                  Conv.
                </th>
                {anyRevenue && (
                  <th scope="col" className={cn(th, "hidden sm:table-cell")}>
                    Revenue
                  </th>
                )}
                <th scope="col" className={cn(th, "w-[32px]")}>
                  <span className="sr-only">KPI</span>
                </th>
                <th scope="col" className={cn(th, "w-[48px]")}>
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => {
                const selected = state.sel === String(g.id);
                const isKpi = kpi.goal?.id === g.id;
                return (
                  <tr
                    key={g.id}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "border-b border-rule",
                      selected && "bg-teal-bar"
                    )}
                  >
                    <td className="w-full max-w-0 truncate py-[9px]">
                      <button
                        type="button"
                        onClick={() =>
                          update(withParam(state, "sel", String(g.id)), {
                            replace: true,
                          })
                        }
                        aria-current={selected ? "true" : undefined}
                        className={cn(
                          "max-w-full truncate rounded-chip text-left font-medium text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
                          selected &&
                            "text-teal-ink underline decoration-teal underline-offset-[3px]"
                        )}
                      >
                        {g.name}
                      </button>
                    </td>
                    <td className="whitespace-nowrap pl-4 text-left text-[12.5px] text-ink-2">
                      {g.kind === "pageview" ? "page" : "event"}{" "}
                      <code className="rounded-chip bg-soft px-1 py-px text-[12px]">
                        {g.match}
                      </code>
                    </td>
                    <td className="whitespace-nowrap pl-4 text-right text-[13.5px] tabular">
                      {fmtInt(g.stats.completions)}
                    </td>
                    {compare && (
                      <td className="whitespace-nowrap pl-3 text-left text-[11.5px] text-mute tabular">
                        <ChangeSlot
                          current={g.stats.completions}
                          previous={g.previous?.completions ?? null}
                        />
                      </td>
                    )}
                    <td className="whitespace-nowrap pl-4 text-right text-ink-2 tabular">
                      {fmtRatio(g.stats.converting_sessions, g.stats.sessions)}
                    </td>
                    {anyRevenue && (
                      <td className="hidden whitespace-nowrap pl-4 text-right text-ink-2 tabular sm:table-cell">
                        {g.revenue ? fmtRevenue(g.stats.revenue) : "—"}
                      </td>
                    )}
                    <td className="pl-3 text-right">
                      <button
                        type="button"
                        aria-pressed={isKpi}
                        aria-label={
                          isKpi
                            ? `${g.name} is the KPI, activate to clear`
                            : `Make ${g.name} the KPI`
                        }
                        onClick={() => star(g.id, !isKpi)}
                        disabled={isGuest}
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-chip text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
                          isKpi ? "text-teal" : "text-faint hover:text-ink",
                          isGuest && "cursor-not-allowed"
                        )}
                      >
                        {isKpi ? "★" : "☆"}
                      </button>
                    </td>
                    <td className="pl-2 text-right">
                      <GoalForm
                        slug={slug}
                        isGuest={isGuest}
                        goal={g}
                        isKpi={isKpi}
                        trigger={
                          <button
                            type="button"
                            aria-label={`Edit ${g.name}`}
                            className="text-[12px] text-teal-ink hover:underline"
                          >
                            Edit
                          </button>
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
