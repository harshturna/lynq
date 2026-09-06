import { expect, test } from "@playwright/test";
import { axeClean, open, SITE_PATH } from "./helpers";

// Visitor journeys (TICKET-074): a converting session from a goal, a recent
// session from a page, and the visitor's other sessions from the drawer.
test("a goal's converting sessions open the drawer, and the drawer offers the visitor's day", async ({
  page,
}) => {
  await open(page, `${SITE_PATH}/goals`);
  await page.getByRole("button", { name: "Signup", exact: true }).click();
  await expect(page).toHaveURL(/sel=/);
  await expect(
    page.getByRole("heading", { name: "Converting sessions" })
  ).toBeVisible({ timeout: 20_000 });
  // the selected goal's list is the only session list on the screen
  const rows = page.getByRole("button", { name: "Session", exact: true });
  await expect(rows.first()).toBeVisible();
  await rows.first().click();

  const dialog = page.getByRole("dialog", { name: "Session" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/session=/);
  // the converting session shows the completion
  await expect(
    dialog.getByText("signup", { exact: true }).first()
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Also today" })
  ).toBeVisible();
  await expect(dialog.getByText(/a day is the whole story/)).toBeVisible();

  // when the visitor had another session that day, opening it swaps the drawer in place
  const other = dialog.getByRole("button", { name: "Open" }).first();
  if (await other.isVisible().catch(() => false)) {
    const before = page.url();
    await other.click();
    await expect(page).not.toHaveURL(before);
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).not.toHaveURL(/session=/);
  }
  await axeClean(page);
});

test("a page's recent sessions open the drawer", async ({ page }) => {
  await open(page, `${SITE_PATH}/pages`);
  await page
    .getByRole("button", { name: /^\/pricing, press Enter to select/ })
    .click();
  await expect(page).toHaveURL(/sel=/);
  await expect(
    page.getByRole("heading", { name: "Recent sessions on this page" })
  ).toBeVisible({ timeout: 20_000 });
  await page
    .getByRole("button", { name: "Session", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Session" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("/pricing").first()).toBeVisible();
});
