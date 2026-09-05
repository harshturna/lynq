/**
 * Date ranges (design §9.1). Every range is half-open, `[from, toExclusive)`,
 * and calendar ranges are computed in the site's timezone. No `between`
 * anywhere in the query layer.
 */
export type Granularity = "hour" | "day" | "week" | "month";

export type Range =
  | "last_24h"
  | "last_7d"
  | "last_30d"
  | "last_90d"
  | "last_12mo"
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | { from: string; to: string }; // YYYY-MM-DD, inclusive dates in the site timezone

export type ResolvedRange = {
  from: Date;
  toExclusive: Date;
  granularity: Granularity;
  calendar: boolean;
};

export type CompareMode = "previous_period" | "previous_year";

type Parts = { y: number; m: number; d: number; h: number; weekday: number };

const DAY = 86_400_000;

function formatter(tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Calendar parts of an instant in a timezone. */
export function zonedParts(date: Date, tz: string): Parts {
  const parts = Object.fromEntries(
    formatter(tz)
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
    h: Number(parts.hour),
    weekday: WEEKDAYS.indexOf(parts.weekday ?? "Sun"),
  };
}

function offsetMinutes(date: Date, tz: string): number {
  const p = zonedParts(date, tz);
  const parts = Object.fromEntries(
    formatter(tz)
      .formatToParts(date)
      .map((x) => [x.type, x.value])
  );
  const asUtc = Date.UTC(
    p.y,
    p.m - 1,
    p.d,
    p.h,
    Number(parts.minute),
    Number(parts.second)
  );
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** The UTC instant of local midnight on a calendar date in a timezone. */
export function zonedMidnight(
  y: number,
  m: number,
  d: number,
  tz: string
): Date {
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - offsetMinutes(new Date(guess), tz) * 60_000;
  const second = guess - offsetMinutes(new Date(first), tz) * 60_000;
  return new Date(second);
}

function addDays(
  y: number,
  m: number,
  d: number,
  days: number
): [number, number, number] {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
}

function addMonths(y: number, m: number, months: number): [number, number] {
  const t = new Date(Date.UTC(y, m - 1 + months, 1));
  return [t.getUTCFullYear(), t.getUTCMonth() + 1];
}

function parseDate(s: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`invalid date ${s}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function defaultGranularity(from: Date, toExclusive: Date): Granularity {
  const days = (toExclusive.getTime() - from.getTime()) / DAY;
  if (days <= 2) return "hour";
  if (days <= 45) return "day";
  if (days <= 180) return "week";
  return "month";
}

export function resolveRange(
  range: Range,
  tz: string,
  now = new Date()
): ResolvedRange {
  const today = zonedParts(now, tz);
  const midnight = (y: number, m: number, d: number) =>
    zonedMidnight(y, m, d, tz);
  const todayStart = midnight(today.y, today.m, today.d);

  if (typeof range === "object") {
    const [fy, fm, fd] = parseDate(range.from);
    const [ty, tm, td] = parseDate(range.to);
    const from = midnight(fy, fm, fd);
    const toExclusive = midnight(...addDays(ty, tm, td, 1));
    if (toExclusive <= from) throw new Error("range end before start");
    return {
      from,
      toExclusive,
      granularity: defaultGranularity(from, toExclusive),
      calendar: true,
    };
  }

  switch (range) {
    case "last_24h":
      return {
        from: new Date(now.getTime() - DAY),
        toExclusive: now,
        granularity: "hour",
        calendar: false,
      };
    case "last_7d":
    case "last_30d":
    case "last_90d": {
      const n = range === "last_7d" ? 7 : range === "last_30d" ? 30 : 90;
      const from = midnight(...addDays(today.y, today.m, today.d, -(n - 1)));
      return {
        from,
        toExclusive: now,
        granularity: n > 45 ? "week" : "day",
        calendar: false,
      };
    }
    case "last_12mo": {
      const [y, m] = addMonths(today.y, today.m, -11);
      return {
        from: midnight(y, m, 1),
        toExclusive: now,
        granularity: "month",
        calendar: false,
      };
    }
    case "today":
      return {
        from: todayStart,
        toExclusive: midnight(...addDays(today.y, today.m, today.d, 1)),
        granularity: "hour",
        calendar: true,
      };
    case "yesterday":
      return {
        from: midnight(...addDays(today.y, today.m, today.d, -1)),
        toExclusive: todayStart,
        granularity: "hour",
        calendar: true,
      };
    case "this_week": {
      const back = (today.weekday + 6) % 7; // Monday start
      const from = midnight(...addDays(today.y, today.m, today.d, -back));
      const toExclusive = midnight(
        ...addDays(today.y, today.m, today.d, 7 - back)
      );
      return { from, toExclusive, granularity: "day", calendar: true };
    }
    case "this_month": {
      const [ny, nm] = addMonths(today.y, today.m, 1);
      return {
        from: midnight(today.y, today.m, 1),
        toExclusive: midnight(ny, nm, 1),
        granularity: "day",
        calendar: true,
      };
    }
    default: {
      const never: never = range;
      throw new Error(`unknown range ${String(never)}`);
    }
  }
}

/** The comparison window: the same length immediately before, or the same dates a year earlier. */
export function compareRange(
  resolved: ResolvedRange,
  mode: CompareMode,
  tz: string
): { from: Date; toExclusive: Date } {
  if (mode === "previous_period") {
    const length = resolved.toExclusive.getTime() - resolved.from.getTime();
    return {
      from: new Date(resolved.from.getTime() - length),
      toExclusive: resolved.from,
    };
  }
  const f = zonedParts(resolved.from, tz);
  const t = zonedParts(resolved.toExclusive, tz);
  if (resolved.calendar) {
    return {
      from: zonedMidnight(f.y - 1, f.m, f.d, tz),
      toExclusive: zonedMidnight(t.y - 1, t.m, t.d, tz),
    };
  }
  return {
    from: new Date(resolved.from.getTime() - 365 * DAY),
    toExclusive: new Date(resolved.toExclusive.getTime() - 365 * DAY),
  };
}

/** Every bucket start in a range, in the site timezone, for zero-filling a series. */
export function buckets(
  from: Date,
  toExclusive: Date,
  granularity: Granularity,
  tz: string
): Date[] {
  const out: Date[] = [];
  const start = zonedParts(from, tz);
  let cursor: Date;
  if (granularity === "hour") {
    cursor = new Date(Math.floor(from.getTime() / 3_600_000) * 3_600_000);
    while (cursor < toExclusive) {
      out.push(cursor);
      cursor = new Date(cursor.getTime() + 3_600_000);
    }
    return out;
  }
  let y = start.y;
  let m = start.m;
  let d = start.d;
  if (granularity === "week") {
    const back = (start.weekday + 6) % 7;
    [y, m, d] = addDays(y, m, d, -back);
  }
  if (granularity === "month") d = 1;
  cursor = zonedMidnight(y, m, d, tz);
  while (cursor < toExclusive) {
    out.push(cursor);
    if (granularity === "month") {
      [y, m] = addMonths(y, m, 1);
    } else {
      [y, m, d] = addDays(y, m, d, granularity === "week" ? 7 : 1);
    }
    cursor = zonedMidnight(y, m, d, tz);
  }
  return out;
}
