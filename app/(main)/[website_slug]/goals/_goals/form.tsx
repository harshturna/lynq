"use client";

import * as Popover from "@radix-ui/react-popover";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import {
  createGoal,
  deleteGoal,
  type GoalInput,
  updateGoal,
} from "@/lib/screens/goal-actions";
import type { KpiGoal } from "@/lib/screens/kpi";

const FIELD =
  "h-8 rounded-control border border-rule px-2 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal";

/**
 * The goal form (design §8.8): name, kind, what completes it, revenue, KPI,
 * target. Creates or edits; a two-step delete sits under the edit form.
 */
export function GoalForm({
  slug,
  isGuest,
  goal,
  isKpi,
  trigger,
}: {
  slug: string;
  isGuest: boolean;
  /** Editing an existing goal, or creating when absent. */
  goal?: KpiGoal;
  isKpi?: boolean;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState<GoalInput>(() => blank(goal, isKpi));
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof GoalInput>(k: K, v: GoalInput[K]) =>
    setInput((s) => ({ ...s, [k]: v }));
  const submit = () =>
    start(async () => {
      setError("");
      const res = goal
        ? await updateGoal(slug, goal.id, input)
        : await createGoal(slug, input);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  const remove = () =>
    start(async () => {
      if (!goal) return;
      setError("");
      const res = await deleteGoal(slug, goal.id);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setError("");
        setConfirm(false);
        if (o) setInput(blank(goal, isKpi));
      }}
    >
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-[340px] rounded-control border border-rule bg-canvas p-4 text-[13px] shadow-[0_8px_24px_-12px_rgba(10,10,10,0.25)]"
        >
          {isGuest ? (
            <p className="text-mute">The guest account cannot change goals.</p>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label className="flex flex-col gap-1">
                <span className="text-[11.5px] text-mute">Name</span>
                <input
                  value={input.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Signup"
                  required
                  className={FIELD}
                />
              </label>
              <fieldset className="flex flex-col gap-1">
                <legend className="text-[11.5px] text-mute">
                  Completes when
                </legend>
                <div className="flex gap-3 py-1">
                  {(["pageview", "event"] as const).map((k) => (
                    <label key={k} className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="kind"
                        checked={input.kind === k}
                        onChange={() => set("kind", k)}
                        className="accent-teal"
                      />
                      {k === "pageview" ? "a page is viewed" : "an event fires"}
                    </label>
                  ))}
                </div>
                <input
                  value={input.match}
                  onChange={(e) => set("match", e.target.value)}
                  placeholder={
                    input.kind === "pageview" ? "/thanks or /docs/*" : "signup"
                  }
                  required
                  aria-label={
                    input.kind === "pageview" ? "Path glob" : "Event name"
                  }
                  className={FIELD}
                />
              </fieldset>
              <label className="flex flex-col gap-1">
                <span className="text-[11.5px] text-mute">
                  Target, completions per month (optional)
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={input.target ?? ""}
                  onChange={(e) =>
                    set(
                      "target",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className={FIELD}
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={input.revenue}
                  onChange={(e) => set("revenue", e.target.checked)}
                  className="accent-teal"
                />
                Carries revenue
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={input.kpi}
                  onChange={(e) => set("kpi", e.target.checked)}
                  className="accent-teal"
                />
                Make this the KPI
              </label>
              {error && <p className="text-[12px] text-poor">{error}</p>}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="h-8 rounded-control bg-ink px-3 text-[13px] font-medium text-canvas disabled:bg-soft disabled:text-mute"
                >
                  {pending ? "Saving…" : goal ? "Save goal" : "Create goal"}
                </button>
                {goal &&
                  (confirm ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={remove}
                      className="text-[12.5px] text-poor hover:underline"
                    >
                      {pending ? "Deleting…" : "Delete for good"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirm(true)}
                      className="text-[12.5px] text-mute hover:text-ink"
                    >
                      Delete
                    </button>
                  ))}
              </div>
            </form>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function blank(
  goal: KpiGoal | undefined,
  isKpi: boolean | undefined
): GoalInput {
  return goal
    ? {
        name: goal.name,
        kind: goal.kind,
        match: goal.match,
        revenue: goal.revenue,
        target: goal.target,
        kpi: Boolean(isKpi),
      }
    : {
        name: "",
        kind: "pageview",
        match: "",
        revenue: false,
        target: null,
        kpi: false,
      };
}
