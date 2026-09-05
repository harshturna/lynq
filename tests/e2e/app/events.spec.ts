import { expect, test } from "@playwright/test";
import { open, SITE_PATH, sharedCopy } from "./helpers";

test("events: select an event, open a session drawer, share it", async ({
  page,
  browser,
}) => {
  await open(page, `${SITE_PATH}/events`);
  await page
    .getByRole("button", { name: /^signup, press Enter to select/ })
    .click();
  await expect(page).toHaveURL(/sel=signup/);
  await expect(
    page.getByRole("heading", { level: 2, name: "signup" })
  ).toBeVisible();

  // The drawer is a modal dialog; Escape closes it and focus returns to the opener.
  const opener = page.getByRole("button", { name: "Session" }).first();
  await opener.click();
  await expect(page).toHaveURL(/session=/);
  const dialog = page.getByRole("dialog", { name: "Session" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Session" })).toBeFocused();
  const url = page.url();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/session=/);
  await expect(opener).toBeFocused();

  // The shared URL reopens the drawer on load.
  const copy = await sharedCopy(browser, url);
  await expect(copy.getByRole("dialog", { name: "Session" })).toBeVisible();
  await copy.context().close();
});
