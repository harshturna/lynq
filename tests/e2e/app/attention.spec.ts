import { expect, test } from "@playwright/test";
import { axeClean, noPageOverflow, open, SITE_PATH } from "./helpers";

// The Attention view (D-016): the pool of attention, split and then ranked.
test("names the pool, splits it, and ranks pages by share", async ({
  page,
}) => {
  await open(page, `${SITE_PATH}/pages`);
  await page
    .getByRole("tablist", { name: "Pages view" })
    .getByRole("tab", { name: "Attention" })
    .click();
  await expect(page).toHaveURL(/view\.pages=attention/);

  // the lead states the unit once, so the rows do not have to
  await expect(
    page.getByText(/of attention in the last 30 days/)
  ).toBeVisible();
  await expect(page.getByText(/pages above hold/)).toBeVisible();
  // the split bar names itself from its segments, so it reads as data
  await expect(
    page.getByRole("img", { name: /\/docs\/getting-started \d+%/ })
  ).toBeVisible();

  const table = page.getByRole("table").first();
  await expect(
    table.getByRole("columnheader", { name: "Share" })
  ).toBeVisible();
  await expect(
    table.getByRole("columnheader", { name: "Influence" })
  ).toBeVisible();
  // shares are ordered, so the first row holds the most attention
  const shares = await table
    .locator("tbody tr td:nth-child(2)")
    .allInnerTexts();
  const numbers = shares.map((s) => Number.parseFloat(s));
  expect(numbers.length).toBeGreaterThan(2);
  expect([...numbers].sort((a, b) => b - a)).toEqual(numbers);
  await noPageOverflow(page);
  await axeClean(page);
});

test("a row filters the whole view, as every other table does", async ({
  page,
}) => {
  await open(page, `${SITE_PATH}/pages?view.pages=attention`);
  await page
    .getByRole("button", { name: /^Filter by \// })
    .first()
    .click();
  await expect(page).toHaveURL(/f=path/);
});

test.describe("at 375 px", () => {
  test.use({ viewport: { width: 375, height: 900 } });
  test("the lead still reads and nothing overflows", async ({ page }) => {
    await open(page, `${SITE_PATH}/pages?view.pages=attention`);
    await expect(
      page.getByText(/of attention in the last 30 days/)
    ).toBeVisible();
    await noPageOverflow(page);
    await axeClean(page);
  });
});
