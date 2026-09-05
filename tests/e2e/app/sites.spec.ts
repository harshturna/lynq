import { expect, test } from "@playwright/test";
import { GUEST_STATE } from "../../../playwright.config";
import { SITE } from "./fixture";
import { open, SITE_PATH } from "./helpers";

test("sites: the list links to the site and to onboarding", async ({
  page,
}) => {
  await open(page, "/sites");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sites");
  await expect(page.getByText(SITE.url)).toBeVisible();
  await page.getByRole("link", { name: SITE.name }).click();
  await expect(page).toHaveURL(new RegExp(`${SITE_PATH}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overview");

  await open(page, "/sites");
  await page.getByRole("link", { name: "+ Add a site" }).click();
  await expect(page).toHaveURL(/\/sites\/new$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Add a site"
  );
});

test.describe("as the guest", () => {
  test.use({ storageState: GUEST_STATE });
  test("sites: the guest owns nothing and cannot add a site", async ({
    page,
  }) => {
    await open(page, "/sites");
    await expect(page.getByText(/no sites yet/i)).toBeVisible();
    await open(page, "/sites/new");
    await expect(page.getByRole("button", { name: "Add site" })).toBeDisabled();
  });
});
