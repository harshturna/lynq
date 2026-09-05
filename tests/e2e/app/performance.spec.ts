import { expect, test } from "@playwright/test";
import { open, SITE_PATH, sharedCopy } from "./helpers";

test("performance: device segment, select a page, share round-trip", async ({
  page,
  browser,
}) => {
  await open(page, `${SITE_PATH}/performance`);
  await expect(page.getByRole("region", { name: "Web Vitals" })).toBeVisible();

  await page
    .getByRole("tab", { name: "Mobile" })
    .or(page.getByRole("radio", { name: "Mobile" }))
    .or(page.getByRole("button", { name: "Mobile" }))
    .first()
    .click();
  await expect(page).toHaveURL(/device=mobile/);

  await page
    .getByRole("button", { name: /press Enter to select/ })
    .first()
    .click();
  await expect(page).toHaveURL(/sel=/);
  await expect(
    page.getByRole("heading", { level: 2, name: "LCP element" })
  ).toBeVisible({ timeout: 20_000 });

  const copy = await sharedCopy(browser, page.url());
  await expect(copy).toHaveURL(/device=mobile/);
  await expect(copy.locator("[aria-current='true']").first()).toBeVisible();
  await copy.context().close();
});
