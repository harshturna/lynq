import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
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
import { EXCLUDED_KEYS } from "@/constants";

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
  data: AnalyticsDataWithSessionData[] | []
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

export function addSessionDataToAnalytics(
  analyticsData: AnalyticsData[],
  sessionData: SessionData[]
): AnalyticsDataWithSessionData[] | [] {
  if (!analyticsData.length || !sessionData.length) {
    return [];
  }

  const res = analyticsData.map((data) => {
    const session = sessionData.find(
      (session) => data.session_id === session.session_id
    );
    if (!session)
      return {
        ...data,
        country: "Unknown",
        device: "Unknown" as Device,
        operating_system: "Unknown" as Os,
        browser: "Unknown" as Browser,
        city: "Unknown",
      };
    return {
      ...data,
      country: session.country,
      device: session.device,
      operating_system: session.operating_system,
      browser: session.browser,
      city: session.city,
    };
  });
  return res;
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

export const calculateAverageVital = (
  vitals: Array<WebVitalsResponseData>
): WebVitalsMetrics & { size: number } => {
  if (!vitals.length) {
    return {
      lcp: -1,
      cls: -1,
      dcl: -1,
      fcp: -1,
      inp: -1,
      interaction_count: -1,
      load: -1,
      resource_count: -1,
      tbt: -1,
      total_js_heap: -1,
      ttfb: -1,
      tti: -1,
      used_js_heap: -1,
      size: -1,
    } as WebVitalsMetrics & { size: number };
  }

  const initialAccumulator = Object.keys(vitals[0]).reduce((acc, key) => {
    if (
      !EXCLUDED_KEYS.includes(
        key as "id" | "created_at" | "session_id" | "website_url"
      )
    ) {
      acc[key] = 0;
    }
    return acc;
  }, {} as Record<string, number>);

  const sums = vitals.reduce((acc, vitalData) => {
    for (const [key, value] of Object.entries(vitalData)) {
      if (
        !EXCLUDED_KEYS.includes(
          key as "id" | "created_at" | "session_id" | "website_url"
        ) &&
        typeof value === "number"
      ) {
        acc[key] = (acc[key] || 0) + value;
      }
    }
    return acc;
  }, initialAccumulator);

  const size = vitals.length;
  const averages = Object.entries(sums).reduce((acc, [key, sum]) => {
    acc[key] = Number((sum / size).toFixed(2));
    return acc;
  }, {} as Record<string, number>);

  return {
    ...averages,
    size,
  } as WebVitalsMetrics & { size: number };
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

  const hoursArray = eachHourOfInterval({
    start: dayStart,
    end: dayEnd,
  });

  const hourCounts = hoursArray.reduce((acc, hour) => {
    const localHour = toZonedTime(hour, timezone);
    const hourKey = dateFnsFormat(startOfHour(localHour), "HH:mm");
    acc[hourKey] = 0;
    return acc;
  }, {} as Record<string, number>);

  data.forEach((entry) => {
    const utcDate = parseISO(entry.created_at);
    const localDate = toZonedTime(utcDate, timezone);

    if (localDate >= twentyThreeHoursAgo && localDate <= oneHourFromNow) {
      const hourKey = dateFnsFormat(startOfHour(localDate), "HH:mm");
      hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
    }
  });

  return hoursArray.map((hour) => {
    const localHour = toZonedTime(hour, timezone);
    const hourKey = dateFnsFormat(startOfHour(localHour), "HH:mm");
    return {
      date: formatInTimeZone(localHour, timezone, "yyyy-MM-dd HH:mm:ssXXX"),
      [toProcess]: hourCounts[hourKey] || 0,
    };
  });
};

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

export const convertByteToMB = (bytes: number): number => {
  return Number((bytes / (1024 * 1024)).toFixed(2));
};

export const calculateWebVitalScore = (
  value: number,
  type: WebVitalType
): WebVitalScore => {
  let range: "Good" | "Need improvement" | "Poor" | "Not enough data";
  let formattedScore: string;

  if (value <= -1) {
    formattedScore = "N/A";
    range = "Not enough data";
    return { score: formattedScore, range, type };
  }

  // Format and determine range based on metric type
  switch (type) {
    case "cls":
      formattedScore = value.toFixed(3);
      if (value <= 0.1) {
        range = "Good";
      } else if (value <= 0.25) {
        range = "Need improvement";
      } else {
        range = "Poor";
      }
      break;

    case "inp":
      formattedScore = `${value.toFixed(0)}ms`;
      if (value <= 200) {
        range = "Good";
      } else if (value <= 500) {
        range = "Need improvement";
      } else {
        range = "Poor";
      }
      break;

    case "lcp":
      formattedScore = `${value.toFixed(0)}ms`;
      if (value <= 2500) {
        range = "Good";
      } else if (value <= 4000) {
        range = "Need improvement";
      } else {
        range = "Poor";
      }
      break;

    case "fcp":
      formattedScore = `${value.toFixed(0)}ms`;
      if (value <= 1800) {
        range = "Good";
      } else if (value <= 3000) {
        range = "Need improvement";
      } else {
        range = "Poor";
      }
      break;

    case "ttfb":
      formattedScore = `${value.toFixed(0)}ms`;
      if (value <= 800) {
        range = "Good";
      } else if (value <= 1800) {
        range = "Need improvement";
      } else {
        range = "Poor";
      }
      break;

    case "tbt":
      formattedScore = `${value.toFixed(0)}ms`;
      if (value <= 200) {
        range = "Good";
      } else if (value <= 600) {
        range = "Need improvement";
      } else {
        range = "Poor";
      }
      break;

    case "load":
      formattedScore = `${value.toFixed(0)}ms`;
      if (value <= 3000) {
        range = "Good";
      } else if (value <= 6000) {
        range = "Need improvement";
      } else {
        range = "Poor";
      }
      break;

    case "tti":
      formattedScore = `${value.toFixed(0)}ms`;
      if (value <= 3800) {
        range = "Good";
      } else if (value <= 7300) {
        range = "Need improvement";
      } else {
        range = "Poor";
      }
      break;

    case "dcl":
      formattedScore = `${value.toFixed(0)}ms`;
      if (value <= 2500) {
        range = "Good";
      } else if (value <= 4000) {
        range = "Need improvement";
      } else {
        range = "Poor";
      }
      break;
  }

  return {
    score: formattedScore,
    range,
    type,
  };
};

export function groupEventsByEventId(
  events: CustomEventWithSessionData[]
): GroupedCustomEventWithSessionData[] {
  return Object.values(
    events.reduce<GroupedCustomEventWithSessionDataAccumulatorType>(
      (acc, event) => {
        const {
          event_id,
          property_name,
          property_value,
          ...eventWithoutProperties
        } = event;

        if (!acc[event_id]) {
          acc[event_id] = {
            ...eventWithoutProperties,
            event_id,
            properties: [],
          };
        }

        if (property_name !== null && property_value !== null) {
          acc[event_id].properties.push({
            property_name,
            property_value,
          });
        }

        return acc;
      },
      {}
    )
  );
}
