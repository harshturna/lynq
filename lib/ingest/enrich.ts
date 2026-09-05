import { UAParser } from "ua-parser-js";

export type UaInfo = {
  browser: string;
  browser_major: number;
  browser_version: string;
  os: string;
  os_version: string;
  device: "desktop" | "mobile" | "tablet" | "";
};

const EMPTY: UaInfo = {
  browser: "",
  browser_major: 0,
  browser_version: "",
  os: "",
  os_version: "",
  device: "",
};

/** Browser, OS and device class from the User-Agent (design §7.2 step 9). */
export function parseUserAgent(ua: string | null): UaInfo {
  if (!ua) return { ...EMPTY };
  const r = new UAParser(ua).getResult();
  const major = Number.parseInt(r.browser.major ?? "", 10);
  const type = r.device.type;
  const device: UaInfo["device"] =
    type === "mobile"
      ? "mobile"
      : type === "tablet"
        ? "tablet"
        : r.browser.name
          ? "desktop"
          : "";
  return {
    browser: r.browser.name ?? "",
    browser_major: Number.isFinite(major) ? Math.min(major, 32767) : 0,
    browser_version: r.browser.version ?? "",
    os: r.os.name ?? "",
    os_version: r.os.version ?? "",
    device,
  };
}
