import { type ClassValue, clsx } from "clsx";
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
      // Stored in milliseconds like every other vital; only the display is seconds
      formattedScore = `${(value / 1000).toFixed(2)}s`;
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
