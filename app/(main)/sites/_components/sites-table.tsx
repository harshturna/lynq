"use client";

import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sparkline, trendLabel } from "@/components/charts/charts";
import { ChangeSlot, Pill } from "@/components/shell/badge";
import { deleteWebsite, updateWebsiteOne } from "@/lib/actions";
import { fmtAgo, fmtInt } from "@/lib/format";
import type { SiteRow } from "@/lib/screens/sites";
import { cn } from "@/lib/utils";

/** The sites table (design §8.12): the name is the link, the row menu renames or deletes. */
export function SitesTable({
  rows,
  userId,
  isGuest,
}: {
  rows: SiteRow[];
  userId: string;
  isGuest: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-rule px-6 py-9 text-center text-[13px] text-mute">
        <p className="mb-1 text-[15px] font-medium text-ink">
          Add your first site
        </p>
        Give it a name and its hostname; the next step shows the snippet and
        waits for the first pageview.
      </div>
    );
  }
  const th =
    "whitespace-nowrap border-b border-rule border-t border-t-rule-strong py-2 pl-5 text-right text-[11.5px] font-normal text-mute";
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th scope="col" className={cn(th, "w-full max-w-0 pl-0 text-left")}>
              Site
            </th>
            <th scope="col" className={th}>
              Visitors
            </th>
            <th scope="col" className={cn(th, "w-[64px] text-left")}>
              <span className="sr-only">change</span>
            </th>
            <th
              scope="col"
              className={cn(th, "hidden min-[1000px]:table-cell")}
            >
              <span className="sr-only">Trend</span>
            </th>
            <th scope="col" className={cn(th, "hidden sm:table-cell")}>
              KPI
            </th>
            <th scope="col" className={cn(th, "hidden sm:table-cell")}>
              Last event
            </th>
            <th scope="col" className={cn(th, "text-left")}>
              Status
            </th>
            <th scope="col" className={cn(th, "w-[32px]")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className="border-b border-rule">
              <td className="w-full max-w-0 truncate py-[10px]">
                <Link
                  href={`/${r.slug}`}
                  className="font-medium text-ink hover:underline"
                >
                  {r.name}
                </Link>
                <span className="block text-[12px] text-mute">{r.url}</span>
              </td>
              <td className="whitespace-nowrap pl-5 text-right text-[14px] tabular">
                {fmtInt(r.visitors)}
              </td>
              <td className="whitespace-nowrap pl-3 text-left text-[11.5px] text-mute tabular">
                {r.visitors || r.previous ? (
                  <ChangeSlot current={r.visitors} previous={r.previous} />
                ) : (
                  <span className="text-faint">—</span>
                )}
              </td>
              <td className="hidden pl-5 text-right min-[1000px]:table-cell">
                {r.spark.some((v) => v > 0) && (
                  <Sparkline values={r.spark} label={trendLabel(r.spark)} />
                )}
              </td>
              <td className="hidden whitespace-nowrap pl-5 text-right text-ink-2 tabular sm:table-cell">
                {r.kpi === null ? (
                  <Link
                    href={`/${r.slug}/goals`}
                    className="text-teal-ink hover:underline"
                  >
                    set
                  </Link>
                ) : (
                  fmtInt(r.kpi)
                )}
              </td>
              <td className="hidden whitespace-nowrap pl-5 text-right text-ink-2 sm:table-cell">
                {r.lastAt ? fmtAgo(new Date(r.lastAt)) : "never"}
              </td>
              <td className="whitespace-nowrap pl-5 text-left">
                <Pill status={r.status.tone}>{r.status.text}</Pill>
              </td>
              <td className="pl-3 text-right">
                <RowMenu row={r} userId={userId} isGuest={isGuest} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pt-[10px] text-[12px] text-mute">
        {rows.length} {rows.length === 1 ? "site" : "sites"}
      </p>
    </div>
  );
}

function RowMenu({
  row,
  userId,
  isGuest,
}: {
  row: SiteRow;
  userId: string;
  isGuest: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(row.name);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const rename = () =>
    start(async () => {
      setError("");
      const res = await updateWebsiteOne(row.slug, "name", name.trim(), userId);
      if (typeof res === "string") return setError(res);
      if (res) return setError("Couldn't rename the site.");
      setOpen(false);
      router.refresh();
    });
  const remove = () =>
    start(async () => {
      setError("");
      const res = await deleteWebsite(row.slug, userId);
      if (typeof res === "string") return setError(res);
      if (res) return setError(res.message);
      setOpen(false);
      router.refresh();
    });
  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setConfirm(false);
        setError("");
        setName(row.name);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Settings for ${row.name}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-chip text-faint hover:bg-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        >
          <span aria-hidden>⋯</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          className="z-50 w-[260px] rounded-control border border-rule bg-canvas p-3 text-[13px] shadow-[0_8px_24px_-12px_rgba(10,10,10,0.25)]"
        >
          {isGuest ? (
            <p className="text-mute">The guest account cannot change sites.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11.5px] text-mute">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 rounded-control border border-rule px-2 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending || !name.trim() || name.trim() === row.name}
                  onClick={rename}
                  className="h-8 rounded-control bg-ink px-3 text-[13px] font-medium text-canvas disabled:opacity-40"
                >
                  Rename
                </button>
                {confirm ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={remove}
                    className="h-8 rounded-control bg-poor px-3 text-[13px] font-medium text-canvas"
                  >
                    {pending ? "Deleting…" : "Delete for good"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirm(true)}
                    className="h-8 rounded-control px-2 text-[13px] text-poor hover:bg-poor-soft"
                  >
                    Delete…
                  </button>
                )}
              </div>
              {confirm && (
                <p className="text-[12px] text-mute">
                  Deletes {row.url} and its events. This cannot be undone.
                </p>
              )}
              {error && <p className="text-[12px] text-poor">{error}</p>}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
