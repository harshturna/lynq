import { expect, type Page, test } from "@playwright/test";
import { GUEST_STATE } from "../../../playwright.config";
import { open, SITE_PATH } from "./helpers";

/**
 * No dead links (TICKET-062): every internal href on every route, as the
 * owner, as the guest and signed out, answers without a 404; the external
 * docs and GitHub links answer too. Links are fetched, not clicked, so one
 * spec covers hundreds of them in seconds.
 */
const OWNER_ROUTES = [
  "/sites",
  "/sites/new",
  SITE_PATH,
  `${SITE_PATH}/pages`,
  `${SITE_PATH}/sources`,
  `${SITE_PATH}/locations`,
  `${SITE_PATH}/devices`,
  `${SITE_PATH}/events`,
  `${SITE_PATH}/goals`,
  `${SITE_PATH}/performance`,
  `${SITE_PATH}/realtime`,
  `${SITE_PATH}/settings`,
];
const PUBLIC_ROUTES = ["/", "/privacy", "/login", "/sign-up", "/no-such-page"];

async function hrefsOn(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .map((a) => a.getAttribute("href") ?? "")
      .filter((h) => h && !h.startsWith("#") && !h.startsWith("mailto:"))
  );
}

async function checkRoutes(page: Page, routes: string[]) {
  const internal = new Set<string>();
  const external = new Set<string>();
  for (const route of routes) {
    await open(page, route);
    for (const h of await hrefsOn(page)) {
      if (/^https?:\/\//.test(h)) external.add(h);
      else internal.add(h.split("#")[0]);
    }
  }
  const dead: string[] = [];
  for (const href of internal) {
    const res = await page.request.get(href, { maxRedirects: 5 });
    if (res.status() >= 400) dead.push(`${href} → ${res.status()}`);
  }
  expect(dead, "internal links that do not resolve").toEqual([]);
  return external;
}

test("every link the owner can see resolves", async ({ page }) => {
  test.setTimeout(180_000);
  const external = await checkRoutes(page, OWNER_ROUTES);
  const dead: string[] = [];
  for (const href of external) {
    const res = await page.request
      .get(href, { maxRedirects: 5, timeout: 20_000 })
      .catch(() => null);
    if (!res || res.status() >= 400)
      dead.push(`${href} → ${res?.status() ?? "no response"}`);
  }
  expect(dead, "external links that do not resolve").toEqual([]);
});

test.describe("as the guest", () => {
  test.use({ storageState: GUEST_STATE });
  test("every link the guest can see resolves", async ({ page }) => {
    await checkRoutes(page, ["/sites", "/sites/new"]);
  });
});

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("every link on the public pages resolves", async ({ page }) => {
    await checkRoutes(page, PUBLIC_ROUTES);
  });
});
