import { expect, test } from "@playwright/test";
import { open, SITE_PATH, sharedCopy } from "./helpers";

test("overview: metric, filter, view and the share round-trip", async ({
  page,
  browser,
}) => {
  await open(page, SITE_PATH);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overview");
  const metrics = page.getByRole("radiogroup", { name: "Metric" });
  await expect(
    metrics.getByRole("radio", { name: /Unique visitors/ })
  ).toBeChecked();

  // The checked tile drives the lead chart and lives in the URL.
  // The radios are visually hidden; their label is the tile's number.
  await metrics
    .getByRole("radio", { name: /Sessions/ })
    .locator("..")
    .click();
  await expect(page).toHaveURL(/metric=sessions/);
  await expect(
    page.getByRole("heading", { level: 2, name: "Sessions" })
  ).toBeVisible();

  // A row's Filter button adds a chip, announced once.
  await page.getByRole("button", { name: "Filter by /pricing" }).click();
  await expect(page).toHaveURL(/f=path/);
  const chip = page.getByRole("button", {
    name: /\/pricing, press Delete to remove/,
  });
  await expect(chip).toBeVisible();
  // ... with the filter count and the visitor total appended (design §6).
  await expect(page.getByRole("status").first()).toContainText(
    /Added Page is \/pricing\. 1 filter\. [\d,]+ visitors\./,
    { timeout: 15_000 }
  );

  // The table's segmented caption is a tablist of links writing view.pages.
  await page
    .getByRole("tablist", { name: "Pages view" })
    .getByRole("tab", { name: "Entry" })
    .click();
  await expect(page).toHaveURL(/view\.pages=entry/);

  // Share: a fresh context renders the same state from the URL alone.
  const copy = await sharedCopy(browser, page.url());
  await expect(copy.getByRole("radio", { name: /Sessions/ })).toBeChecked();
  await expect(
    copy.getByRole("button", { name: /\/pricing, press Delete to remove/ })
  ).toBeVisible();
  await expect(copy.getByRole("tab", { name: "Entry" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await copy.context().close();

  // Delete on a focused chip removes it and moves focus to + Filter.
  await chip.focus();
  await page.keyboard.press("Delete");
  await expect(page).not.toHaveURL(/f=/);
  await expect(page.getByRole("button", { name: "+ Filter" })).toBeFocused();

  // Stepping the range writes a custom range and enables the next step.
  await expect(
    page.getByRole("button", { name: "Next period", exact: true })
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Previous period", exact: true })
    .click();
  await expect(page).toHaveURL(/range=/);
  await expect(
    page.getByRole("button", { name: "Next period", exact: true })
  ).toBeEnabled();
});
