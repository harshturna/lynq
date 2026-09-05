import { AxeBuilder } from "@axe-core/playwright";
import { type Browser, expect, type Page } from "@playwright/test";
import { OWNER_STATE } from "../../../playwright.config";
import { SITE } from "./fixture";

export const SITE_PATH = `/${SITE.slug}`;

/** Loads a route and waits for its heading. */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator("h1").first()).toBeVisible();
  // Controls answer only once hydrated; the network going quiet is the tell.
  await page.waitForLoadState("networkidle");
}

/** No axe violations on the page (the Next dev overlay is not ours). */
export async function axeClean(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page })
    .exclude("nextjs-portal")
    .analyze();
  expect(
    result.violations.map(
      (v) =>
        `${v.id}: ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(" "))
          .join(", ")}`
    )
  ).toEqual([]);
}

/** The page body never scrolls sideways (design §13). */
export async function noPageOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow).toBe(0);
}

/** The share round-trip: the same URL in a fresh context renders the same state. */
export async function sharedCopy(browser: Browser, url: string): Promise<Page> {
  const ctx = await browser.newContext({
    storageState: OWNER_STATE,
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto(url);
  await expect(page.locator("h1").first()).toBeVisible();
  return page;
}

/** A filter chip by its sentence ("Country is Canada"). */
export function chip(page: Page, sentence: RegExp) {
  return page.getByRole("button", { name: sentence }).filter({
    hasText: /./,
  });
}
