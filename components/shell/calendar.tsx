"use client";

import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A two-date calendar (design §6): a table named with the month and the site
 * timezone (Biome rejects role="grid" on a table; the native table plus one
 * roving tab stop gives the same experience); arrows move a day, PageUp/PageDown a month, Home/End the
 * week; aria-selected on the range, aria-current="date" on today. Selecting
 * the start announces "Start … selected. Choose an end date."
 */
export function Calendar({
  timezone,
  today,
  from,
  to,
  onChange,
  announce,
}: {
  timezone: string;
  today: string;
  from?: string;
  to?: string;
  onChange: (range: { from: string; to?: string }) => void;
  announce?: (text: string) => void;
}) {
  const [month, setMonth] = useState(() =>
    startOfMonth(parseISO(to ?? from ?? today))
  );
  const [focused, setFocused] = useState(() => to ?? from ?? today);
  const gridRef = useRef<HTMLTableElement>(null);
  const wantsFocus = useRef(false);

  useEffect(() => {
    if (!wantsFocus.current) return;
    wantsFocus.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)
      ?.focus();
  }, [focused]);

  const first = startOfWeek(month, { weekStartsOn: 1 });
  const last = endOfMonth(month);
  const days: Date[] = [];
  for (let d = first; d <= last || days.length % 7 !== 0; d = addDays(d, 1))
    days.push(d);
  const iso = (d: Date) => format(d, "yyyy-MM-dd");
  const todayDate = parseISO(today);

  const move = (date: string) => {
    const d = parseISO(date);
    if (isAfter(d, todayDate)) return;
    wantsFocus.current = true;
    setFocused(date);
    if (d < startOfMonth(month) || d > last) setMonth(startOfMonth(d));
  };

  const pick = (date: string) => {
    if (from && !to && date >= from) {
      onChange({ from, to: date });
      announce?.(
        `Range ${format(parseISO(from), "MMM d")} to ${format(parseISO(date), "MMM d")} selected.`
      );
    } else {
      onChange({ from: date });
      announce?.(
        `Start ${format(parseISO(date), "MMM d")} selected. Choose an end date.`
      );
    }
  };

  const onKeyDown = (e: React.KeyboardEvent, date: string) => {
    const d = parseISO(date);
    const map: Record<string, Date | undefined> = {
      ArrowLeft: addDays(d, -1),
      ArrowRight: addDays(d, 1),
      ArrowUp: addDays(d, -7),
      ArrowDown: addDays(d, 7),
      PageUp: addMonths(d, -1),
      PageDown: addMonths(d, 1),
      Home: startOfWeek(d, { weekStartsOn: 1 }),
      End: addDays(startOfWeek(d, { weekStartsOn: 1 }), 6),
    };
    const next = map[e.key];
    if (next) {
      e.preventDefault();
      move(iso(next));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(date);
    }
  };

  const monthLabel = format(month, "MMMM yyyy");
  return (
    <div className="w-[272px] select-none">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonth(addMonths(month, -1))}
          className="h-7 w-7 rounded-control text-ink-2 hover:bg-soft"
        >
          ‹
        </button>
        <div className="text-[13px] font-medium text-ink" aria-hidden>
          {monthLabel}
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={!isBefore(last, todayDate)}
          className="h-7 w-7 rounded-control text-ink-2 hover:bg-soft disabled:text-faint"
        >
          ›
        </button>
      </div>
      <table
        ref={gridRef}
        aria-label={`${monthLabel}, dates in ${timezone}`}
        className="w-full border-separate border-spacing-[2px]"
      >
        <thead>
          <tr>
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((w) => (
              <th
                key={w}
                scope="col"
                className="pb-1 text-center text-[11px] font-normal text-mute"
              >
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: days.length / 7 }, (_, r) => (
            <tr key={days[r * 7].toISOString()}>
              {days.slice(r * 7, r * 7 + 7).map((d) => {
                const date = iso(d);
                const outside = d.getMonth() !== month.getMonth();
                const future = isAfter(d, todayDate);
                const inRange = Boolean(
                  from && date >= from && (to ? date <= to : date === from)
                );
                const isEdge = date === from || date === to;
                return (
                  <td key={date} className="p-0">
                    <button
                      type="button"
                      data-date={date}
                      tabIndex={date === focused ? 0 : -1}
                      disabled={future}
                      aria-pressed={inRange}
                      aria-current={date === today ? "date" : undefined}
                      aria-label={format(d, "EEEE, MMMM d, yyyy")}
                      onKeyDown={(e) => onKeyDown(e, date)}
                      onClick={() => pick(date)}
                      onFocus={() => setFocused(date)}
                      className={cn(
                        "h-8 w-full rounded-chip text-[12.5px] tabular transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal",
                        outside && "text-faint",
                        !outside && !future && "text-ink hover:bg-soft",
                        future && "text-faint",
                        inRange && !isEdge && "bg-teal-soft text-teal-ink",
                        isEdge && "bg-teal text-white",
                        date === today &&
                          !inRange &&
                          "underline underline-offset-4 decoration-teal"
                      )}
                    >
                      {d.getDate()}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
