import { expect, test } from "@playwright/test";
import { open, SITE_PATH, sharedCopy } from "./helpers";

test("devices: expand a browser, filter by it, share round-trip", async ({
  page,
  browser,
}) => {
  await open(page, `${SITE_PATH}/devices`);
  await expect(page.getByRole("img", { name: /^Devices:/ })).toBeVisible();

  const expand = page.getByRole("button", { name: "Expand Chrome" });
  await expand.click();
  await expect(
    page.getByRole("button", { name: "Collapse Chrome" })
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("button", { name: /^Chrome, version .*press Enter/ }).first()
  ).toBeVisible();

  await page.getByRole("button", { name: "Filter by Chrome" }).first().click();
  await expect(page).toHaveURL(/f=browser/);
  await expect(
    page.getByRole("button", {
      name: /Browser is Chrome, press Delete to remove/,
    })
  ).toBeVisible();

  const copy = await sharedCopy(browser, page.url());
  await expect(
    copy.getByRole("button", {
      name: /Browser is Chrome, press Delete to remove/,
    })
  ).toBeVisible();
  await copy.context().close();
});
