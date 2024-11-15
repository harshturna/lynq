import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  startOfToday,
  endOfToday,
  eachHourOfInterval,
  parseISO,
  format as dateFnsFormat,
  startOfMonth,
  subMonths,
  startOfDay,
  subDays,
  eachDayOfInterval,
  format,
  eachWeekOfInterval,
  startOfWeek,
  endOfWeek,
  eachMonthOfInterval,
  addDays,
  startOfHour,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function containsInvalidCharacters(s: string) {
  const regex = /[^a-zA-Z0-9.]/;
  return regex.test(s);
}

export function copyContent(content: string) {
  if (!content) return false;
  navigator.clipboard.writeText(content);
  return true;
}

export function getTimeFrame(timeFrame: DatePickerValues): string {
  const now = new Date();

  switch (timeFrame) {
    case "Today":
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString();

    case "Last 7 days":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    case "Last 30 days":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    case "Last 3 months":
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      return threeMonthsAgo.toISOString();

    case "Last 12 months":
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      return oneYearAgo.toISOString();

    default:
      throw new Error(`Invalid timeframe: ${timeFrame}`);
  }
}

export function groupByAnalytics(
  groupBy: AnalyticsGroupBy,
  data: AnalyticsData[]
) {
  switch (groupBy) {
    // pathname
    case "pages":
      const res = data.reduce<{ group: string; count: number }[]>(
        (res, site) => {
          const existingIndex = res.findIndex(
            (obj) => obj.group === site.pathname
          );

          if (existingIndex !== -1) {
            res[existingIndex].count += 1;
          } else {
            res.push({
              group: site.pathname,
              count: 1,
            });
          }

          return res;
        },
        []
      );
      return res;

    case "browsers": {
      const res = data.reduce<{ group: Browser; count: number }[]>(
        (res, site) => {
          const existingIndex = res.findIndex(
            (obj) => obj.group === site.browser
          );

          if (existingIndex !== -1) {
            res[existingIndex].count += 1;
          } else {
            res.push({
              group: site.browser,
              count: 1,
            });
          }

          return res;
        },
        []
      );
      return res;
    }
    case "devices": {
      const res = data.reduce<{ group: Device; count: number }[]>(
        (res, site) => {
          const existingIndex = res.findIndex(
            (obj) => obj.group === site.device
          );

          if (existingIndex !== -1) {
            res[existingIndex].count += 1;
          } else {
            res.push({
              group: site.device,
              count: 1,
            });
          }

          return res;
        },
        []
      );
      return res;
    }

    case "operating_systems": {
      const res = data.reduce<{ group: Os; count: number }[]>((res, site) => {
        const existingIndex = res.findIndex(
          (obj) => obj.group === site.operating_system
        );

        if (existingIndex !== -1) {
          res[existingIndex].count += 1;
        } else {
          res.push({
            group: site.operating_system,
            count: 1,
          });
        }

        return res;
      }, []);
      return res;
    }

    case "countries": {
      const res = data.reduce<{ group: string; count: number }[]>(
        (res, site) => {
          const existingIndex = res.findIndex(
            (obj) => obj.group === site.country
          );

          if (existingIndex !== -1) {
            res[existingIndex].count += 1;
          } else {
            res.push({
              group: site.country || "Unknown",
              count: 1,
            });
          }

          return res;
        },
        []
      );
      return res;
    }

    case "referrers": {
      const res = data.reduce<
        { group: "Direct" | "Unknown" | string; count: number }[]
      >((res, site) => {
        const existingIndex = res.findIndex(
          (obj) => obj.group === site.referrer
        );

        if (existingIndex !== -1) {
          res[existingIndex].count += 1;
        } else {
          res.push({
            group: site.referrer,
            count: 1,
          });
        }

        return res;
      }, []);
      return res;
    }
  }
}

export const calculateAverageSessionDuration = (
  sessions: Array<{ session_duration: number }>
) => {
  if (!sessions?.length) return 0;

  return Number(
    (
      sessions.reduce(
        (acc, session) => acc + (session.session_duration || 0),
        0
      ) /
      sessions.length /
      60000
    ).toFixed(2)
  );
};

export const calculateBounceRate = (
  sessions: Array<{ session_duration: number }>
) => {
  if (!sessions?.length) return 0;

  const BOUNCE_THRESHOLD_MILLISECONDS = 10000; // 10 seconds

  // Count bounces
  const bounceCount = sessions.reduce((acc, session) => {
    if (session.session_duration < BOUNCE_THRESHOLD_MILLISECONDS) {
      return acc + 1;
    }
    return acc;
  }, 0);

  // Calculate percentage
  return Number(((bounceCount / sessions.length) * 100).toFixed(2));
};

export const process24HourData = (
  analyticsData: AnalyticsData[],
  sessionData: SessionData[],
  toProcess: "sessions" | "views"
): ChartDataPoint[] => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const data = toProcess === "sessions" ? sessionData : analyticsData;

  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000);

  const dayStart = fromZonedTime(twentyThreeHoursAgo, timezone);
  const dayEnd = fromZonedTime(oneHourFromNow, timezone);

  // Create hourly buckets
  const hoursArray = eachHourOfInterval({
    start: dayStart,
    end: dayEnd,
  });

  // Initialize counts for each full hour
  const hourCounts = hoursArray.reduce((acc, hour) => {
    const localHour = toZonedTime(hour, timezone);
    const hourKey = dateFnsFormat(startOfHour(localHour), "HH:mm");
    acc[hourKey] = 0;
    return acc;
  }, {} as Record<string, number>);

  // Count entries by rounding down to nearest hour
  data.forEach((entry) => {
    const utcDate = parseISO(entry.created_at);
    const localDate = toZonedTime(utcDate, timezone);

    if (localDate >= twentyThreeHoursAgo && localDate <= oneHourFromNow) {
      const hourKey = dateFnsFormat(startOfHour(localDate), "HH:mm");
      hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
    }
  });

  // Create final array including the hour containing current time
  return hoursArray.map((hour) => {
    const localHour = toZonedTime(hour, timezone);
    const hourKey = dateFnsFormat(startOfHour(localHour), "HH:mm");
    return {
      date: formatInTimeZone(localHour, timezone, "yyyy-MM-dd HH:mm:ssXXX"),
      [toProcess]: hourCounts[hourKey] || 0,
    };
  });
};

// Last 7 days processing
export const process7DaysData = (
  analyticsData: AnalyticsData[],
  sessionData: SessionData[],
  toProcess: "sessions" | "views"
): ChartDataPoint[] => {
  const now = new Date();
  const start = startOfDay(subDays(now, 6)); // 6 days ago + today = 7 days
  const data = toProcess === "sessions" ? sessionData : analyticsData;

  const daysArray = eachDayOfInterval({ start, end: now });

  const dayCounts = daysArray.reduce((acc, day) => {
    acc[format(day, "yyyy-MM-dd")] = 0;
    return acc;
  }, {} as Record<string, number>);

  data.forEach((entry) => {
    const date = parseISO(entry.created_at);
    if (date >= start && date <= now) {
      const dayKey = format(date, "yyyy-MM-dd");
      dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
    }
  });

  return daysArray.map((day) => ({
    date: format(day, "yyyy-MM-dd"),
    [toProcess]: dayCounts[format(day, "yyyy-MM-dd")] || 0,
  }));
};

// Last 30 days processing
export const process30DaysData = (
  analyticsData: AnalyticsData[],
  sessionData: SessionData[],
  toProcess: "sessions" | "views"
): ChartDataPoint[] => {
  const now = new Date();
  const start = startOfDay(subDays(now, 29));
  const data = toProcess === "sessions" ? sessionData : analyticsData;
  const daysArray = eachDayOfInterval({ start, end: now });

  const dayCounts = daysArray.reduce((acc, day) => {
    acc[format(day, "yyyy-MM-dd")] = 0;
    return acc;
  }, {} as Record<string, number>);

  data.forEach((entry) => {
    const date = parseISO(entry.created_at);
    if (date >= start && date <= now) {
      const dayKey = format(date, "yyyy-MM-dd");
      dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
    }
  });

  return daysArray.map((day) => ({
    date: format(day, "yyyy-MM-dd"),
    [toProcess]: dayCounts[format(day, "yyyy-MM-dd")] || 0,
  }));
};

// Last 3 months processing
export const process3MonthsData = (
  analyticsData: AnalyticsData[],
  sessionData: SessionData[],
  toProcess: "sessions" | "views"
): ChartDataPoint[] => {
  const now = new Date();
  const start = startOfDay(subMonths(now, 3));
  const data = toProcess === "sessions" ? sessionData : analyticsData;
  const weeksArray = eachWeekOfInterval(
    { start, end: now },
    { weekStartsOn: 1 }
  );

  const weekCounts = weeksArray.reduce((acc, week) => {
    acc[format(week, "yyyy-MM-dd")] = 0;
    return acc;
  }, {} as Record<string, number>);

  data.forEach((entry) => {
    const date = parseISO(entry.created_at);
    if (date >= start && date <= now) {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekKey = format(weekStart, "yyyy-MM-dd");
      weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1;
    }
  });

  return weeksArray.map((week) => {
    const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
    return {
      date: format(week, "yyyy-MM-dd"),
      [toProcess]: weekCounts[format(week, "yyyy-MM-dd")] || 0,
      label: `${format(week, "MMM d")} - ${format(weekEnd, "MMM d")}`,
    };
  });
};

// Last 12 months processing
export const process12MonthsData = (
  analyticsData: AnalyticsData[],
  sessionData: SessionData[],
  toProcess: "sessions" | "views"
): ChartDataPoint[] => {
  const now = new Date();
  const start = startOfMonth(subMonths(now, 11));
  const data = toProcess === "sessions" ? sessionData : analyticsData;
  const monthsArray = eachMonthOfInterval({ start, end: now });

  const monthCounts = monthsArray.reduce((acc, month) => {
    acc[format(month, "yyyy-MM")] = 0;
    return acc;
  }, {} as Record<string, number>);

  data.forEach((entry) => {
    const date = parseISO(entry.created_at);
    if (date >= start && date <= now) {
      const monthKey = format(date, "yyyy-MM");
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    }
  });

  return monthsArray.map((month) => ({
    date: format(month, "yyyy-MM"),
    [toProcess]: monthCounts[format(month, "yyyy-MM")] || 0,
  }));
};

export const getFormatters = (selectedTimeFrame: DatePickerValues) => {
  switch (selectedTimeFrame) {
    case "Today":
      return {
        xAxis: (value: string) => format(parseISO(value), "h:mm a"),
        tooltip: (value: string) => format(parseISO(value), "h:mm a"),
      };
    case "Last 7 days":
    case "Last 30 days":
      return {
        xAxis: (value: string) => format(parseISO(value), "MMM d"),
        tooltip: (value: string) => format(parseISO(value), "MMM d, yyyy"),
      };
    case "Last 3 months":
      return {
        xAxis: (value: string) => {
          // Parse start date and add 6 days for week range
          const startDate = parseISO(value);
          const endDate = addDays(startDate, 6);
          return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`;
        },
        tooltip: (value: string) => {
          const startDate = parseISO(value);
          const endDate = addDays(startDate, 6);
          return `${format(startDate, "MMM d")} - ${format(
            endDate,
            "MMM d, yyyy"
          )}`;
        },
      };
    case "Last 12 months":
      return {
        xAxis: (value: string) => format(parseISO(value), "MMM yyyy"),
        tooltip: (value: string) => format(parseISO(value), "MMMM yyyy"),
      };
    default:
      return {
        xAxis: (value: string) => value,
        tooltip: (value: string) => value,
      };
  }
};
