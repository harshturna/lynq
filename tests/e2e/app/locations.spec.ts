import { expect, test } from "@playwright/test";
import { open, SITE_PATH, sharedCopy } from "./helpers";

test("locations: a country filter narrows every table; share round-trip", async ({
  page,
  browser,
}) => {
  await open(page, `${SITE_PATH}/locations`);
  const countries = page.getByRole("region", { name: "Countries" });
  await expect(
    countries
      .getByRole("button", { name: /press Enter to (select|filter)/ })
      .first()
  ).toBeVisible();

  await countries.getByRole("button", { name: "Filter by 🇨🇦 Canada" }).click();
  await expect(page).toHaveURL(/f=country/);
  await expect(
    page.getByRole("button", {
      name: /Canada, press Delete to remove/,
    })
  ).toBeVisible();
  await expect(
    countries.getByRole("button", { name: /press Enter to (select|filter)/ })
  ).toHaveCount(1);
  await expect(
    page
      .getByRole("region", { name: "Regions" })
      .getByRole("button", { name: /press Enter to (select|filter)/ })
      .first()
  ).toBeVisible();

  const copy = await sharedCopy(browser, page.url());
  await expect(
    copy
      .getByRole("region", { name: "Countries" })
      .getByRole("button", { name: /press Enter to (select|filter)/ })
  ).toHaveCount(1);
  await copy.context().close();
});
