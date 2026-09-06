import { expect, test } from "@playwright/test";
import { axeClean, open, SITE_PATH } from "./helpers";

// The command menu (TICKET-079): one keystroke to any screen, range or
// comparison, with the URL doing the work as everywhere else.
test("opens on the keyboard and navigates", async ({ page }) => {
  await open(page, SITE_PATH);
  await page.keyboard.press("ControlOrMeta+k");
  const menu = page.getByRole("dialog", { name: "Commands" });
  await expect(menu).toBeVisible();
  await page.screenshot({ path: "test-results/command-menu.png" });
  await axeClean(page);

  await page.getByRole("combobox").fill("sourc");
  await expect(menu.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${SITE_PATH}/sources$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sources");
});

test("changes the range, and the URL carries it", async ({ page }) => {
  await open(page, SITE_PATH);
  await page.getByRole("button", { name: "⌘K" }).click();
  await page.getByRole("combobox").fill("last 7");
  await page.getByRole("option", { name: "Last 7 days" }).click();
  await expect(page).toHaveURL(/range=last_7d/);
  await expect(page.getByRole("button", { name: /Date range/ })).toContainText(
    "Last 7 days"
  );
});

test("Escape closes it and returns focus to the button", async ({ page }) => {
  await open(page, SITE_PATH);
  const button = page.getByRole("button", { name: "⌘K" });
  await button.click();
  await expect(page.getByRole("dialog", { name: "Commands" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Commands" })).toBeHidden();
  await expect(button).toBeFocused();
});

test("clears a filter it can see", async ({ page }) => {
  await open(page, `${SITE_PATH}?f=country%3Ais%3ACA`);
  await page.getByRole("button", { name: "⌘K" }).click();
  await page.getByRole("combobox").fill("clear");
  await page.getByRole("option", { name: "Clear all filters" }).click();
  await expect(page).not.toHaveURL(/f=country/);
});

test.describe("at 375 px", () => {
  test.use({ viewport: { width: 375, height: 900 } });
  test("the menu still opens on the keyboard and is clean", async ({
    page,
  }) => {
    await open(page, SITE_PATH);
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByRole("dialog", { name: "Commands" })).toBeVisible();
    await page.screenshot({ path: "test-results/command-menu-375.png" });
    await axeClean(page);
  });
});
