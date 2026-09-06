import { expect, test } from "@playwright/test";
import { axeClean, open, SITE_PATH } from "./helpers";

// Notes on charts (TICKET-076): the seeded launch notes are marked on the
// Overview, the owner adds one from the chart and manages it in Settings.
test("the seeded notes are marked on the lead chart and listed in settings", async ({
  page,
}) => {
  await open(page, `${SITE_PATH}?range=last_90d`);
  // the hidden table carries a Notes column with the seeded sentences
  const table = page.locator("figure table").first();
  await expect(
    table.getByRole("columnheader", { name: "Notes" })
  ).toBeAttached();
  await expect(table.getByText("Launched on Product Hunt")).toBeAttached();
  await expect(
    page.getByRole("link", { name: /notes in this range/ })
  ).toBeVisible();

  await open(page, `${SITE_PATH}/settings`);
  const notes = page.getByRole("region", { name: "Notes" });
  await expect(notes.getByText("Launched on Product Hunt")).toBeVisible();
  await expect(notes.getByText("key: Deploy pipeline")).toBeVisible();
});

test("the owner adds a note from the chart, edits it, and deletes it", async ({
  page,
}) => {
  await open(page, SITE_PATH);
  await page.getByRole("button", { name: "+ Add note" }).click();
  await page
    .getByRole("textbox", { name: "Note" })
    .fill("Shipped the new onboarding");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(
    page.locator("figure table").first().getByText("Shipped the new onboarding")
  ).toBeAttached({
    timeout: 20_000,
  });

  await open(page, `${SITE_PATH}/settings#notes`);
  await page
    .getByRole("button", { name: "Edit note: Shipped the new onboarding" })
    .click();
  await page
    .getByRole("textbox", { name: "Note" })
    .fill("Shipped the new onboarding flow");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText("Shipped the new onboarding flow")).toBeVisible({
    timeout: 20_000,
  });

  await page
    .getByRole("button", { name: "Edit note: Shipped the new onboarding flow" })
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete for good" }).click();
  await expect(page.getByText("Shipped the new onboarding flow")).toHaveCount(
    0,
    { timeout: 20_000 }
  );
  await axeClean(page);
});
