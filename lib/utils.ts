import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
    case "page":
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

    case "browser": {
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
    case "device": {
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

    case "operating_system": {
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

    case "country": {
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

    case "referrer": {
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
