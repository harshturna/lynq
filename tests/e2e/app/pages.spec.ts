import { expect, test } from "@playwright/test";
import { open, SITE_PATH, sharedCopy } from "./helpers";

test("pages: search, select, keyboard filter and the share round-trip", async ({
  page,
  browser,
}) => {
  await open(page, `${SITE_PATH}/pages`);
  const table = page.getByRole("region", { name: "Pages" });

  // Search narrows the table without touching the URL.
  await page.getByRole("textbox", { name: "Search paths" }).fill("docs");
  await expect(
    table.getByRole("button", { name: /^\/docs\/api, press Enter/ })
  ).toBeVisible();
  await expect(
    table.getByRole("button", { name: /^\/pricing, press Enter/ })
  ).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search paths" }).fill("");

  // Enter on a row selects it: sel in the URL, aria-current on the row, a panel named after it.
  const pricing = table.getByRole("button", {
    name: /^\/pricing, press Enter to select/,
  });
  await pricing.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/sel=/);
  await expect(
    page.getByRole("heading", { level: 2, name: "/pricing" })
  ).toBeVisible();
  await expect(table.locator("tr[aria-current='true']")).toHaveCount(1);

  // Rows are one Tab stop with roving focus; F filters the focused row.
  await pricing.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    table.getByRole("button", { name: /press Enter to select/ }).nth(2)
  ).toBeFocused();
  await page.keyboard.press("f");
  await expect(page).toHaveURL(/f=path/);
  await expect(
    page.getByRole("button", { name: /press Delete to remove/ })
  ).toBeVisible();

  const copy = await sharedCopy(browser, page.url());
  await expect(
    copy.getByRole("heading", { level: 2, name: "/pricing" })
  ).toBeVisible();
  await expect(
    copy.getByRole("button", { name: /press Delete to remove/ })
  ).toBeVisible();
  await copy.context().close();
});
