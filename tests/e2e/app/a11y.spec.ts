import { expect, test } from "@playwright/test";
import { GUEST_STATE } from "../../../playwright.config";
import { axeClean, noPageOverflow, open, SITE_PATH } from "./helpers";

// Every route, both widths, no axe violations and no sideways page scroll
// (design §13). The owner sees the fixture site; the guest owns nothing.
const ROUTES = [
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

for (const width of [1280, 375]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const route of ROUTES) {
      test(`${route} is clean`, async ({ page }) => {
        await open(page, route);
        await page.waitForLoadState("networkidle");
        await noPageOverflow(page);
        await axeClean(page);
      });
    }
  });
}

test.describe("as the guest", () => {
  test.use({ storageState: GUEST_STATE });
  for (const route of ["/sites", "/sites/new"]) {
    test(`${route} is clean`, async ({ page }) => {
      await open(page, route);
      if (route === "/sites/new")
        await expect(page.getByText(/guest/i).first()).toBeVisible();
      await axeClean(page);
    });
  }
});
